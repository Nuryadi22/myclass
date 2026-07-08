import React from 'react';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import {
  GraduationCap,
  Calendar,
  Award,
  ImageIcon,
  Heart,
  ClipboardList,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import ReportPrintFilter from '@/components/ReportPrintFilter';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; school_year?: string; place?: string }>;
}

export default async function TeacherStudentReportDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { month, school_year, place } = await searchParams;
  const studentId = parseInt(id, 10);
  const selectedYear = school_year || '2025/2026';
  const printPlace = place || 'Jakarta';

  const session = await getSession();
  const teacherName = session?.name || 'Wali Kelas';
  const todayIndoDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  if (isNaN(studentId)) {
    notFound();
  }

  // Fetch student
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      parent: {
        select: { name: true, username: true, email: true },
      },
    },
  });

  if (!student) {
    notFound();
  }

  // Fetch all related logs
  const rawActivities = await prisma.activity.findMany({
    where: { studentId },
    include: {
      teacher: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rawCreativities = await prisma.creativity.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
  });

  const rawAttendances = await prisma.attendance.findMany({
    where: { studentId },
    include: {
      scannedBy: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  });

  const rawPrayers = await prisma.prayer.findMany({
    where: { studentId },
    orderBy: { date: 'desc' },
  });

  // Filter lists by selected month if present
  const activities = month
    ? rawActivities.filter(act => {
        const date = new Date(act.createdAt);
        return (date.getMonth() + 1).toString().padStart(2, '0') === month;
      })
    : rawActivities;

  const creativities = month
    ? rawCreativities.filter(cr => {
        const date = new Date(cr.createdAt);
        return (date.getMonth() + 1).toString().padStart(2, '0') === month;
      })
    : rawCreativities;

  const attendances = month
    ? rawAttendances.filter(att => att.date.split('-')[1] === month)
    : rawAttendances;

  const prayers = month
    ? rawPrayers.filter(pr => pr.date.split('-')[1] === month)
    : rawPrayers;

  // Resolve month name for label display
  const monthsNames: Record<string, string> = {
    '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
    '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
  };
  const selectedMonthName = month ? monthsNames[month] : '';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Print Controls (Hidden when printing) */}
      <ReportPrintFilter studentId={student.id} />

      {/* Printable Area Wrapper */}
      <div id="print-area" className="space-y-8">
        {/* CSS rules for printing */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
            #print-area {
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .bg-white {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
            }
            .grid {
              display: grid !important;
            }
          }
        `}} />

        {/* Back Button & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div className="space-y-2">
            <Link
              href="/teacher/reports"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Rekap Laporan
            </Link>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Detail Laporan Murid</h2>
          </div>
        </div>

        {/* Student Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xl shadow-xs">
            {student.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="space-y-0.5">
            <h3 className="text-lg font-extrabold text-slate-900">{student.name}</h3>
            <p className="text-xs text-slate-500 font-bold">
              Kelas: {student.className}
            </p>
            <p className="text-xs text-slate-500 font-bold">
              NISN: {student.studentId}
            </p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100/50 p-4 rounded-2xl text-center sm:text-right w-full sm:w-auto">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-600 block">Total Poin Akumulatif</span>
          <h4 className="text-2xl font-extrabold text-amber-800 mt-0.5">⭐ {student.totalPoints} Poin</h4>
        </div>
      </div>      <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs mt-8">
        <h3 className="text-base font-extrabold text-slate-855 border-b pb-3 uppercase tracking-wide text-center">
          Rekapitulasi Hasil Belajar
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
          {/* Left Box: Poin & Absensi */}
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <span className="font-bold text-slate-500 uppercase tracking-wide block text-[10px] border-b pb-1.5">REKAPITULASI KEAKTIFAN MURID</span>
              <div className="grid grid-cols-2 gap-y-1 font-semibold text-[11px] text-slate-700">
                <div>Setoran Hafalan:</div><div className="text-right font-bold">{activities.filter(a => a.type === 'memorization').length} Kali</div>
                <div>Literasi:</div><div className="text-right font-bold">{activities.filter(a => a.type === 'literacy').length} Kali</div>
                <div>Numerasi:</div><div className="text-right font-bold">{activities.filter(a => a.type === 'numeracy').length} Kali</div>
                <div>Karya Kreatif:</div><div className="text-right font-bold">{creativities.length} Karya</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
              <span className="font-bold text-slate-800 uppercase tracking-wide block text-[10px] border-b pb-1.5">REKAPITULASI KEHADIRAN</span>
              <div className="grid grid-cols-2 gap-y-1 font-semibold">
                <div>Hadir:</div><div className="text-right font-bold">{attendances.filter(a => a.status === 'present').length} Hari</div>
                <div>Terlambat:</div><div className="text-right font-bold">{attendances.filter(a => a.status === 'late').length} Hari</div>
                <div>Sakit:</div><div className="text-right font-bold">{attendances.filter(a => a.status === 'sick').length} Hari</div>
                <div>Izin:</div><div className="text-right font-bold">{attendances.filter(a => a.status === 'excused').length} Hari</div>
                <div className="text-red-650 font-bold">Alfa:</div><div className="text-right font-bold text-red-650">{attendances.filter(a => a.status === 'absent').length} Hari</div>
              </div>
            </div>
          </div>

          {/* Right Box: Punishment & Shalat */}
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
              <span className="font-bold text-slate-800 uppercase tracking-wide block text-[10px] border-b pb-1.5">REKAPITULASI PELANGGARAN (PUNISHMENT)</span>
              {activities.filter(a => a.type === 'punishment').length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Tidak ada catatan pelanggaran.</p>
              ) : (
                <div className="space-y-1.5 font-semibold">
                  <div className="flex justify-between text-[11px] border-b pb-1 text-slate-500">
                    <span>Keterangan</span>
                    <span>Dampak Poin</span>
                  </div>
                  {activities.filter(a => a.type === 'punishment').map(act => (
                    <div key={act.id} className="flex justify-between text-[11px]">
                      <span className="truncate max-w-[150px]">{act.title}</span>
                      <span className="text-red-500 font-bold">{act.pointsImpact} Poin</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold pt-1 border-t text-red-650">
                    <span>Total Pemotongan:</span>
                    <span>{activities.filter(a => a.type === 'punishment').reduce((sum, a) => sum + a.pointsImpact, 0)} Poin</span>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
              <span className="font-bold text-slate-800 uppercase tracking-wide block text-[10px] border-b pb-1.5">REKAPITULASI SHALAT MANDIRI</span>
              {prayers.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Belum ada laporan ibadah shalat mandiri.</p>
              ) : (
                <div className="grid grid-cols-2 gap-y-1 font-semibold">
                  <div>Subuh:</div><div className="text-right font-bold">{prayers.filter(p => p.subuh).length} Kali</div>
                  <div>Dzuhur:</div><div className="text-right font-bold">{prayers.filter(p => p.dzuhur).length} Kali</div>
                  <div>Ashar:</div><div className="text-right font-bold">{prayers.filter(p => p.ashar).length} Kali</div>
                  <div>Maghrib:</div><div className="text-right font-bold">{prayers.filter(p => p.maghrib).length} Kali</div>
                  <div>Isya:</div><div className="text-right font-bold">{prayers.filter(p => p.isya).length} Kali</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Signature Block (Tanda Tangan Wali Kelas & Orang Tua) */}
        <div className="mt-16 grid grid-cols-2 text-xs font-semibold pt-8 border-t border-slate-100">
          <div>
            <p className="mb-16">Mengetahui,<br />Orang Tua / Wali Murid</p>
            <p className="font-bold border-t border-slate-400 pt-1 w-44 text-slate-900">(............................................)</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="mb-16">{printPlace}, {todayIndoDate}<br />Wali Kelas</p>
            <p className="font-bold border-t border-slate-400 pt-1 w-44 text-right text-slate-900">( {teacherName} )</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

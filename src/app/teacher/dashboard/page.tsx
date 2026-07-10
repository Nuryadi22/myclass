import React from 'react';
import { prisma } from '@/lib/db';
import { Users, ClipboardCheck, Star } from 'lucide-react';
import { getSession } from '@/lib/auth';
import PendingRequestsModal from '@/components/PendingRequestsModal';
import TeacherDashboardClient from '@/components/TeacherDashboardClient';

export const dynamic = 'force-dynamic';

export default async function TeacherDashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());

  const classFilter = session.className ? { className: session.className } : {};

  // Fetch counts
  const totalStudents = await prisma.student.count({
    where: classFilter,
  });
  const todayAttendance = await prisma.attendance.count({
    where: {
      date: todayStr,
      student: classFilter,
    },
  });
  
  const totalPointsAggregate = await prisma.student.aggregate({
    where: classFilter,
    _sum: { totalPoints: true },
  });
  const totalPoints = totalPointsAggregate._sum.totalPoints || 0;

  // Fetch pending parent attendance requests
  const pendingRequests = await prisma.parentAttendanceRequest.findMany({
    where: {
      student: {
        className: session.className || 'default-none-class',
      },
      statusApproval: 'pending',
    },
    include: {
      student: {
        select: {
          name: true,
          studentId: true,
          className: true,
        },
      },
      parent: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Recent 5 activities
  const recentActivities = await prisma.activity.findMany({
    where: {
      student: classFilter,
    },
    include: {
      student: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Recent 5 creativities
  const recentCreativities = await prisma.creativity.findMany({
    where: {
      student: classFilter,
    },
    include: {
      student: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Fetch top 7 students for Bar Chart Leaderboard
  const topStudents = await prisma.student.findMany({
    where: classFilter,
    orderBy: { totalPoints: 'desc' },
    take: 7,
    select: { name: true, totalPoints: true }
  });

  // Fetch today's attendance stats for Pie Chart
  const attendancesToday = await prisma.attendance.findMany({
    where: {
      date: todayStr,
      student: classFilter
    },
    select: { status: true }
  });
  const attendanceStats = {
    present: attendancesToday.filter(a => a.status === 'present').length,
    late: attendancesToday.filter(a => a.status === 'late').length,
    sick: attendancesToday.filter(a => a.status === 'sick').length,
    excused: attendancesToday.filter(a => a.status === 'excused').length,
    absent: attendancesToday.filter(a => a.status === 'absent').length,
  };

  // Fetch students for FaceScanner
  const students = await prisma.student.findMany({
    where: classFilter,
    select: {
      id: true,
      name: true,
      studentId: true,
    },
    orderBy: { name: 'asc' },
  });

  // Fetch class bills (tagihan)
  const classBills = await prisma.classBill.findMany({
    where: session.className ? { className: session.className } : { id: -1 },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch all students in this class with their cash payments
  const studentsWithPayments = await prisma.student.findMany({
    where: classFilter,
    include: {
      classCash: {
        where: {
          type: 'income',
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Calculate billing summary for each student
  const billingSummary = studentsWithPayments.map((std) => {
    const studentBills = classBills.map((bill) => {
      // Find payments by this student for this bill title
      const paid = std.classCash
        .filter((payment) => payment.description.trim().toLowerCase() === bill.title.trim().toLowerCase())
        .reduce((sum, payment) => sum + payment.amount, 0);
      const remaining = Math.max(0, bill.amount - paid);
      return {
        title: bill.title,
        amount: bill.amount,
        paid,
        remaining,
      };
    });

    const totalRemaining = studentBills.reduce((sum, b) => sum + b.remaining, 0);

    return {
      studentId: std.studentId,
      name: std.name,
      bills: studentBills,
      totalRemaining,
    };
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Dashboard Portal Guru</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Kelola kehadiran, keaktifan, dan pantau perkembangan portofolio murid kelas Anda.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Total Murid */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Jumlah Murid</span>
            <h3 className="text-3xl font-extrabold text-slate-850">{totalStudents}</h3>
            <span className="text-[10px] text-indigo-600 font-bold block">Murid Aktif Terdaftar</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Absensi Hari Ini */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Absensi Hari Ini</span>
            <h3 className="text-3xl font-extrabold text-slate-850">{todayAttendance}</h3>
            <span className="text-[10px] text-indigo-600 font-bold block">Murid Sudah Diabsen</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Poin Kelas */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Poin Kelas</span>
            <h3 className="text-3xl font-extrabold text-slate-850">⭐ {totalPoints}</h3>
            <span className="text-[10px] text-amber-600 font-bold block">Akumulasi Seluruh Murid</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-650 flex items-center justify-center">
            <Star className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Interactive Client Section */}
      <TeacherDashboardClient
        students={students}
        topStudents={topStudents}
        attendanceStats={attendanceStats}
        recentActivities={recentActivities}
        recentCreativities={recentCreativities}
      />

      {/* Rincian Tagihan Setiap Murid */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs select-none">
        <div>
          <h3 className="font-extrabold text-slate-850 text-base">Rincian Tagihan Setiap Murid</h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Daftar sisa tagihan iuran kas dan bayar buku yang harus diselesaikan oleh setiap siswa.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Nama Murid</th>
                <th className="py-3 px-4">NISN</th>
                {classBills.map((b) => (
                  <th key={b.id} className="py-3 px-4 text-center">
                    {b.title} (Sisa)
                  </th>
                ))}
                <th className="py-3 px-4 text-right">Total Sisa Tagihan</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-700">
              {billingSummary.length === 0 ? (
                <tr>
                  <td colSpan={3 + classBills.length} className="py-8 text-center text-slate-400 italic font-bold">
                    Belum ada data murid di kelas ini.
                  </td>
                </tr>
              ) : (
                billingSummary.map((std) => (
                  <tr key={std.studentId} className="border-b border-slate-100 hover:bg-slate-50/10 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{std.name}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-[10px] uppercase font-bold">{std.studentId}</td>
                    {std.bills.map((b, bIdx) => (
                      <td key={bIdx} className="py-3.5 px-4 text-center font-mono">
                        {b.remaining === 0 ? (
                          <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-[10px] font-extrabold rounded-full">Lunas</span>
                        ) : (
                          <span className="text-red-500">Rp {b.remaining.toLocaleString('id-ID')}</span>
                        )}
                      </td>
                    ))}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-800">
                      {std.totalRemaining === 0 ? (
                        <span className="text-emerald-600 font-extrabold text-[11px]">✓ LUNAS SEMUA</span>
                      ) : (
                        <span className="text-indigo-900 text-sm">Rp {std.totalRemaining.toLocaleString('id-ID')}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <PendingRequestsModal requests={pendingRequests} />
      )}
    </div>
  );
}

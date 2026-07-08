import React from 'react';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { FileBarChart2, ArrowUpRight, GraduationCap } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TeacherReportsPage() {
  // Fetch students ordered by totalPoints desc, including attendance count
  const students = await prisma.student.findMany({
    include: {
      _count: {
        select: { attendances: true },
      },
      parent: {
        select: { name: true },
      },
    },
    orderBy: { totalPoints: 'desc' },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Laporan Rekapitulasi Murid</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Analisis peringkat poin keaktifan, total kehadiran kelas, dan portofolio detail per murid.
        </p>
      </div>

      {/* Leaderboard/Rekap Card */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
        <div>
          <h4 className="font-extrabold text-slate-855 text-base flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-indigo-600" />
            <span>Peringkat & Rekapitulasi Keaktifan Murid</span>
          </h4>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Data rekapitulasi poin akumulatif diurutkan dari yang tertinggi (Leaderboard Kelas).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">Nama Murid</th>
                <th className="py-3 px-3">NISN (Username)</th>
                <th className="py-3 px-3">Orang Tua</th>
                <th className="py-3 px-3 text-center">Kehadiran (Hari)</th>
                <th className="py-3 px-3 text-right">Poin</th>
                <th className="py-3 px-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-755">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    Belum ada data murid terdaftar.
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => (
                  <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/20 transition-colors">
                    {/* Rank Badge */}
                    <td className="py-4 px-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-slate-900 font-bold">
                      <span className="block leading-tight">{student.name}</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold uppercase mt-1 inline-block">
                        {student.className}
                      </span>
                    </td>
                    <td className="py-4 px-3 font-mono text-xs text-slate-500">{student.studentId}</td>
                    <td className="py-4 px-3 text-slate-700 text-xs">{student.parent?.name || '-'}</td>
                    <td className="py-4 px-3 text-center text-slate-650">
                      📅 {student._count.attendances} Kali
                    </td>
                    <td className="py-4 px-3 text-right text-indigo-600 font-extrabold text-sm">
                      ⭐ {student.totalPoints} Poin
                    </td>
                    {/* View Details Link */}
                    <td className="py-4 px-3 text-center">
                      <Link
                        href={`/teacher/reports/${student.id}`}
                        className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Detail Laporan
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

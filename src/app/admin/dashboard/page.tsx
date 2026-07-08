import React from 'react';
import { prisma } from '@/lib/db';
import { Users, GraduationCap, Award, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // Query statistics
  const totalTeachers = await prisma.user.count({ where: { role: 'teacher' } });
  const totalStudents = await prisma.student.count();
  const totalParents = await prisma.user.count({ where: { role: 'parent' } });

  // Top 5 Students
  const topStudents = await prisma.student.findMany({
    orderBy: { totalPoints: 'desc' },
    take: 5,
  });

  // Get distinct classes
  const classes = await prisma.student.findMany({
    select: { className: true },
    distinct: ['className'],
  });

  // Top student in each class (Class Leaders)
  const classLeaders = [];
  for (const cls of classes) {
    const leader = await prisma.student.findFirst({
      where: { className: cls.className },
      orderBy: { totalPoints: 'desc' },
    });
    if (leader) {
      classLeaders.push({
        className: cls.className,
        studentName: leader.name,
        points: leader.totalPoints,
      });
    }
  }

  // Calculate highest points for progress bar normalization
  const maxPoints = topStudents[0]?.totalPoints || 100;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Dashboard Admin</h2>
        <p className="text-slate-500 text-sm font-semibold">Ringkasan statistik keseluruhan sistem monitoring kelas.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Total Guru */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Guru</span>
            <h3 className="text-3xl font-extrabold text-slate-850">{totalTeachers}</h3>
            <span className="text-[10px] text-indigo-600 font-bold block">Guru Kelas Terdaftar</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Murid */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Murid</span>
            <h3 className="text-3xl font-extrabold text-slate-850">{totalStudents}</h3>
            <span className="text-[10px] text-emerald-600 font-bold block">Murid Aktif Terpantau</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Orang Tua */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Wali Murid</span>
            <h3 className="text-3xl font-extrabold text-slate-850">{totalParents}</h3>
            <span className="text-[10px] text-amber-600 font-bold block">Akun Orang Tua Tertaut</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-650 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top 5 Murid Performance */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
          <div>
            <h4 className="font-extrabold text-slate-850 text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Top 5 Poin Tertinggi Murid</span>
            </h4>
            <p className="text-xs text-slate-400 font-semibold mt-1">Murid dengan perolehan akumulasi poin keaktifan tertinggi.</p>
          </div>

          <div className="space-y-4">
            {topStudents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada data murid.</p>
            ) : (
              topStudents.map((student, idx) => {
                const widthPercent = maxPoints > 0 ? (student.totalPoints / maxPoints) * 100 : 0;
                return (
                  <div key={student.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-bold">{student.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                          {student.className}
                        </span>
                      </div>
                      <span className="text-amber-600 font-extrabold">⭐ {student.totalPoints} Poin</span>
                    </div>
                    {/* Relative Point Bar */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${widthPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Class Leaders Board */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
          <div>
            <h4 className="font-extrabold text-slate-850 text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-indigo-500" />
              <span>Juara Bertahan Tiap Kelas</span>
            </h4>
            <p className="text-xs text-slate-400 font-semibold mt-1">Murid dengan poin terbanyak dari masing-masing tingkatan kelas.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-2">Kelas</th>
                  <th className="py-3 px-2">Nama Murid</th>
                  <th className="py-3 px-2 text-right">Poin</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-750">
                {classLeaders.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">Belum ada data kelas.</td>
                  </tr>
                ) : (
                  classLeaders.map((leader, idx) => (
                    <tr key={idx} className="border-b border-slate-50/50 hover:bg-slate-50/20 transition-colors">
                      <td className="py-3 px-2 text-slate-900 font-extrabold">{leader.className}</td>
                      <td className="py-3 px-2">{leader.studentName}</td>
                      <td className="py-3 px-2 text-right text-indigo-600 font-extrabold">⭐ {leader.points}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

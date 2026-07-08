import React from 'react';
import { prisma } from '@/lib/db';
import TeacherForm from '@/components/TeacherForm';
import DeleteTeacherButton from '@/components/DeleteTeacherButton';
import ResetTeacherDataButton from '@/components/ResetTeacherDataButton';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminTeachersPage() {
  // Fetch all teachers
  const teachers = await prisma.user.findMany({
    where: { role: 'teacher' },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Manajemen Guru Kelas</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Kelola data guru kelas binaan dan pendaftaran akun baru.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Teachers List (Left Column, spans 2 cols on lg) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
          <div>
            <h4 className="font-extrabold text-slate-850 text-base">Daftar Guru Kelas Terdaftar</h4>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              List seluruh akun guru kelas yang aktif di dalam sistem.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">No</th>
                  <th className="py-3 px-3">Nama Lengkap</th>
                  <th className="py-3 px-3">No Induk Guru (NIG)</th>
                  <th className="py-3 px-3">Kelas Binaan</th>
                  <th className="py-3 px-3">Judul Aplikasi</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-755">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                      Belum ada data guru kelas terdaftar.
                    </td>
                  </tr>
                ) : (
                  teachers.map((teacher, idx) => (
                    <tr key={teacher.id} className="border-b border-slate-50 hover:bg-slate-50/20 transition-colors">
                      <td className="py-3.5 px-3 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="py-3.5 px-3 text-slate-900 font-bold">{teacher.name}</td>
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-500">{teacher.username}</td>
                      <td className="py-3.5 px-3">
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-extrabold">
                          {teacher.className || 'Tanpa Kelas'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">
                        {teacher.appTitle ? (
                          <span className="font-bold text-slate-800 lowercase">by {teacher.appTitle}</span>
                        ) : (
                          <span className="text-slate-400 italic">Default</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Guru Aktif
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center flex justify-center gap-1.5">
                        <ResetTeacherDataButton id={teacher.id} name={teacher.name} className={teacher.className || ''} />
                        <DeleteTeacherButton id={teacher.id} name={teacher.name} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Teacher Form (Right Column) */}
        <div>
          <TeacherForm />
        </div>
      </div>
    </div>
  );
}

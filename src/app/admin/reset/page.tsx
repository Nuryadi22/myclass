import React from 'react';
import { prisma } from '@/lib/db';
import ResetAllDataButton from '@/components/ResetAllDataButton';
import ResetTeacherDataButton from '@/components/ResetTeacherDataButton';
import { AlertOctagon, RefreshCcw, ShieldAlert, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminResetPage() {
  // Fetch all teachers
  const teachers = await prisma.user.findMany({
    where: { role: 'teacher' },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-50 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 shadow-3xs">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Pusat Reset Data Sistem</h2>
          <p className="text-slate-500 text-sm font-semibold">
            Kelola pengosongan memori dan reset data murid baik secara global maupun parsial per kelas binaan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Reset per Wali Kelas */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
          <div>
            <h4 className="font-extrabold text-slate-850 text-base flex items-center gap-2">
              <RefreshCcw className="w-4 h-4 text-indigo-500" />
              <span>Reset Data per Kelas Binaan</span>
            </h4>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Bersihkan data murid, absensi, aktivitas, & kas untuk kelas wali murid tertentu tanpa memengaruhi kelas lain.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">No</th>
                  <th className="py-3 px-3">Nama Wali Kelas</th>
                  <th className="py-3 px-3">Kelas Binaan</th>
                  <th className="py-3 px-3 text-center">Aksi Reset</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-750">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-405 italic">
                      Belum ada data guru kelas terdaftar.
                    </td>
                  </tr>
                ) : (
                  teachers.map((teacher, idx) => (
                    <tr key={teacher.id} className="border-b border-slate-50 hover:bg-slate-50/20 transition-colors">
                      <td className="py-3.5 px-3 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="py-3.5 px-3 text-slate-900 font-bold">{teacher.name}</td>
                      <td className="py-3.5 px-3">
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-extrabold">
                          {teacher.className || 'Tanpa Kelas'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center flex justify-center">
                        <ResetTeacherDataButton
                          id={teacher.id}
                          name={teacher.name}
                          className={teacher.className || ''}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Global Data Reset (Danger Zone) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-xs">
            <div>
              <h4 className="font-extrabold text-slate-850 text-base flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-500" />
                <span>Pembersihan Global</span>
              </h4>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Gunakan menu di bawah untuk mengosongkan seluruh memori database murid dan file statis secara instan.
              </p>
            </div>

            <ResetAllDataButton />
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { prisma } from '@/lib/db';
import ActivityForm from '@/components/ActivityForm';

export const dynamic = 'force-dynamic';

export default async function TeacherActivityPage() {
  // Fetch students for dropdown
  const students = await prisma.student.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  // Fetch 10 recent activities (academic)
  const activities = await prisma.activity.findMany({
    where: {
      type: { in: ['memorization', 'literacy', 'numeracy'] },
    },
    include: {
      student: { select: { name: true } },
      teacher: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Pencatatan Keaktifan Harian</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Catat setoran hafalan Quran, aktivitas literasi membaca, dan kemampuan numerasi matematika murid.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Recent Activities List (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
          <div>
            <h4 className="font-extrabold text-slate-855 text-slate-850 text-base">10 Log Aktivitas Keaktifan Terbaru</h4>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Catatan keaktifan murid yang baru dimasukkan hari ini.
            </p>
          </div>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">Belum ada aktivitas keaktifan yang terekam.</p>
            ) : (
              activities.map((act) => {
                const dateStr = new Date(act.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                return (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100/50 rounded-2xl text-xs hover:shadow-2xs transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {act.type === 'memorization' ? '🕌' : act.type === 'literacy' ? '📚' : '🔢'}
                      </span>
                      <div>
                        <span className="font-extrabold text-slate-800 block leading-tight">
                          {act.student.name}
                        </span>
                        <span className="text-[10px] text-slate-450 font-bold uppercase">
                          {act.type}: {act.title}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5 font-semibold">
                          Dicatat oleh: {act.teacher?.name || 'Sistem'} pada {dateStr}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-600 text-sm block">
                        +{act.pointsImpact} Poin
                      </span>
                      <span className="text-[9px] text-amber-500 font-extrabold leading-none">
                        {'★'.repeat(act.rating || 0)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Input Form */}
        <div>
          <ActivityForm students={students} />
        </div>
      </div>
    </div>
  );
}

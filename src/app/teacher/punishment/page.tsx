import React from 'react';
import { prisma } from '@/lib/db';
import PunishmentForm from '@/components/PunishmentForm';

export const dynamic = 'force-dynamic';

export default async function TeacherPunishmentPage() {
  // Fetch students for dropdown and QR matching
  const students = await prisma.student.findMany({
    select: { id: true, name: true, qrCodeToken: true, studentId: true },
    orderBy: { name: 'asc' },
  });

  // Fetch 10 recent punishments
  const punishments = await prisma.activity.findMany({
    where: {
      type: 'punishment',
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
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Pencatatan Punishment & Pelanggaran</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Catat pelanggaran tata tertib murid untuk memberikan efek kedisiplinan dan pengurangan poin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Recent Punishments List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
          <div>
            <h4 className="font-extrabold text-slate-855 text-base">10 Log Pengurangan Poin Terbaru</h4>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Catatan pengurangan poin pelanggaran murid teranyar.
            </p>
          </div>

          <div className="space-y-3">
            {punishments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">Belum ada catatan pelanggaran yang terekam.</p>
            ) : (
              punishments.map((pun) => {
                const dateStr = new Date(pun.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                return (
                  <div
                    key={pun.id}
                    className="flex items-center justify-between p-3.5 bg-red-50/20 border border-red-100/30 rounded-2xl text-xs hover:shadow-2xs transition-shadow animate-slide-in"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <span className="font-extrabold text-slate-900 block leading-tight">
                          {pun.student.name}
                        </span>
                        <span className="text-[10px] text-red-600 font-bold uppercase block leading-none mt-0.5">
                          Alasan: {pun.title}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-1 font-semibold">
                          Dicatat oleh: {pun.teacher?.name || 'Sistem'} pada {dateStr}
                        </span>
                      </div>
                    </div>
                    <span className="font-extrabold text-red-600 text-sm">
                      {pun.pointsImpact} Poin
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Input Form */}
        <div>
          <PunishmentForm students={students} />
        </div>
      </div>
    </div>
  );
}

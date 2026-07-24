import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import PrayerFormList from '@/components/PrayerFormList';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function ParentPrayerPage({ searchParams }: PageProps) {
  const session = await getSession();

  if (!session) {
    return null; // Handled by middleware redirect
  }

  // Get parent's children
  const children = await prisma.student.findMany({
    where: { parentId: session.userId },
  });

  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date()); // YYYY-MM-DD in WIB
  const { date } = await searchParams;
  const targetDate = date || todayStr;

  const prayersData = [];

  for (const child of children) {
    const todayPrayer = await prisma.prayer.findFirst({
      where: {
        studentId: child.id,
        date: targetDate,
      },
    });

    prayersData.push({
      student: {
        id: child.id,
        name: child.name,
        className: child.className,
        studentId: child.studentId,
      },
      today_prayer: todayPrayer
        ? {
            id: todayPrayer.id,
            subuh: todayPrayer.subuh,
            dzuhur: todayPrayer.dzuhur,
            ashar: todayPrayer.ashar,
            maghrib: todayPrayer.maghrib,
            isya: todayPrayer.isya,
            notes: todayPrayer.notes,
          }
        : null,
    });
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Monitoring Shalat Harian</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Catat dan verifikasi ibadah shalat fardhu 5 waktu anak Anda secara mandiri di rumah.
        </p>
      </div>

      <PrayerFormList prayersData={prayersData} todayStr={targetDate} />
    </div>
  );
}

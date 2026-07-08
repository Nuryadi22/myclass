import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { Calendar, User, Star, ClipboardCheck } from 'lucide-react';
import ChildProgressChart from '@/components/ChildProgressChart';
import ClassCashPieChart from '@/components/ClassCashPieChart';
import AttendanceNotificationModal from '@/components/AttendanceNotificationModal';

export const dynamic = 'force-dynamic';

export default async function ParentDashboardPage() {
  const session = await getSession();

  if (!session) {
    return null; // Handled by middleware redirect
  }

  // Get show attendance notification flag from cookie
  const cookieStore = await cookies();
  const showNotification = cookieStore.get('show_attendance_notification')?.value === 'true';

  // Fetch children
  const children = await prisma.student.findMany({
    where: { parentId: session.userId },
  });

  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());

  const childrenData = [];

  for (const child of children) {
    // 1. Today Attendance
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: child.id,
        date: todayStr,
      },
    });

    // 2. Recent Activities (5)
    const recentActivities = await prisma.activity.findMany({
      where: { studentId: child.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 3. Recent Creativities (3)
    const recentCreativities = await prisma.creativity.findMany({
      where: { studentId: child.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // 4. Daily Progression (last 7 days)
    const dailyProgression = await getDailyProgression(child.id);

    // 5. Weekly Progression (last 4 weeks)
    const weeklyProgression = await getWeeklyProgression(child.id);

    // 6. Fetch class cash transactions to calculate totals
    const classCashTransactions = child.className
      ? await prisma.classCash.findMany({
          where: { className: child.className },
        })
      : [];

    const totalIncome = classCashTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = classCashTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    childrenData.push({
      student: child,
      today_attendance: todayAttendance,
      recent_activities: recentActivities,
      recent_creativities: recentCreativities,
      totalIncome,
      totalExpense,
      ...dailyProgression,
      ...weeklyProgression,
    });
  }

  const dateStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Dashboard Orang Tua</h2>
          <p className="text-slate-500 text-sm font-semibold">
            Pantau kehadiran harian, poin keaktifan, dan portofolio anak Anda secara real-time.
          </p>
        </div>
        <div className="text-xs bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 select-none">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Hari ini: {dateStr}</span>
        </div>
      </div>

      {/* Children Overview Grid */}
      <div className={`grid grid-cols-1 ${childrenData.length > 1 ? 'lg:grid-cols-2' : ''} gap-8`}>
        {childrenData.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-xs text-center text-slate-400 font-bold col-span-2">
            Akun Anda belum ditautkan dengan murid manapun. Silakan hubungi Guru Kelas untuk menautkan akun Anda.
          </div>
        ) : (
          childrenData.map((data) => {
            const student = data.student;
            const att = data.today_attendance;

            // Attendance badge mapping
            let statusBg = 'bg-slate-50 border-slate-100 text-slate-800';
            let statusText = 'Belum Diabsen';
            let statusTimeStr = 'Menunggu pencatatan guru';
            let statusIcon = '⏳';

            if (att) {
              if (att.status === 'present') {
                statusBg = 'bg-emerald-50 border-emerald-100/50 text-emerald-800';
                statusText = 'Hadir Tepat Waktu';
                statusTimeStr = `Jam: ${att.time.substring(0, 5)} WIB`;
                statusIcon = '✓';
              } else if (att.status === 'late') {
                statusBg = 'bg-amber-50 border-amber-100/50 text-amber-800';
                statusText = 'Terlambat Datang';
                statusTimeStr = `Jam: ${att.time.substring(0, 5)} WIB`;
                statusIcon = '⏰';
              } else if (att.status === 'sick') {
                statusBg = 'bg-blue-50 border-blue-100/50 text-blue-800';
                statusText = 'Sakit';
                statusTimeStr = `Jam: ${att.time.substring(0, 5)} WIB`;
                statusIcon = '🤒';
              } else if (att.status === 'excused') {
                statusBg = 'bg-indigo-50 border-indigo-100/50 text-indigo-800';
                statusText = 'Izin';
                statusTimeStr = `Jam: ${att.time.substring(0, 5)} WIB`;
                statusIcon = '✉️';
              } else {
                statusBg = 'bg-red-50 border-red-100/50 text-red-800';
                statusText = 'Alfa / Absen';
                statusTimeStr = `Jam: ${att.time.substring(0, 5)} WIB`;
                statusIcon = '✕';
              }
            }

            return (
              <div
                key={student.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all animate-slide-in"
              >
                {/* Top Color Bar */}
                <div className="h-2 bg-emerald-500"></div>

                <div className="p-6 space-y-6">
                  {/* Child Profile */}
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg shadow-2xs">
                        {student.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-850 text-base">{student.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Kelas: {student.className} | NISN: {student.studentId}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Point & Attendance quick stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Points Card */}
                    <div className="bg-amber-50 border border-amber-100/50 p-5 rounded-2xl flex items-center justify-between shadow-2xs">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-600 block">Total Poin</span>
                        <h4 className="text-xl font-extrabold text-amber-800">⭐ {student.totalPoints} Poin</h4>
                        <span className="text-[9px] text-amber-500 font-bold block mt-0.5">Poin Keaktifan Anak</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-100/50 text-amber-700 flex items-center justify-center text-lg shadow-3xs">
                        ★
                      </div>
                    </div>

                    {/* Attendance Card */}
                    <div className={`border p-5 rounded-2xl flex items-center justify-between shadow-2xs ${statusBg}`}>
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">Kehadiran Hari Ini</span>
                        <h4 className="text-xs font-extrabold">{statusText}</h4>
                        <span className="text-[9px] font-bold block mt-0.5">{statusTimeStr}</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center text-sm font-bold shadow-3xs">
                        {statusIcon}
                      </div>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Chart Progress Component */}
                    <ChildProgressChart
                      studentId={student.id}
                      dailyLabels={data.dailyLabels}
                      dailyPoints={data.dailyPoints}
                      weeklyLabels={data.weeklyLabels}
                      weeklyPoints={data.weeklyPoints}
                    />

                    {/* Class Cash Pie Chart */}
                    <ClassCashPieChart
                      className={student.className || ''}
                      totalIncome={data.totalIncome}
                      totalExpense={data.totalExpense}
                    />
                  </div>

                  {/* Recent Activity List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Keaktifan Sekolah Terbaru</h4>
                    <div className="space-y-2">
                      {data.recent_activities.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">Belum ada aktivitas sekolah baru tercatat.</p>
                      ) : (
                        data.recent_activities.map((act) => (
                          <div
                            key={act.id}
                            className="flex items-center justify-between p-2.5 bg-slate-50/50 border border-slate-100/50 rounded-xl text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {act.type === 'memorization'
                                  ? '🕌'
                                  : act.type === 'literacy'
                                  ? '📚'
                                  : act.type === 'numeracy'
                                  ? '🔢'
                                  : act.type === 'punishment'
                                  ? '⚠️'
                                  : '💡'}
                              </span>
                              <div>
                                <span className="font-extrabold text-slate-800 block leading-tight">
                                  {act.title}
                                </span>
                                <span className="text-[9px] text-slate-400 capitalize font-bold">
                                  {act.type}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`font-extrabold ${
                                act.pointsImpact > 0 ? 'text-emerald-600' : 'text-red-500'
                              }`}
                            >
                              {act.pointsImpact > 0 ? `+${act.pointsImpact}` : act.pointsImpact}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Creativity portfolio snapshots */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Karya Kreativitas Anak</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {data.recent_creativities.length === 0 ? (
                        <p className="text-xs text-slate-455 text-center py-4 col-span-3">Belum ada karya kreativitas diunggah.</p>
                      ) : (
                        data.recent_creativities.map((cr) => (
                          <div
                            key={cr.id}
                            className="aspect-square rounded-xl bg-slate-100 overflow-hidden relative border border-slate-100 group shadow-3xs"
                          >
                            <img src={`/${cr.imagePath}`} alt={cr.title} className="object-cover w-full h-full" />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 text-center">
                              <span className="text-[9px] text-white font-bold truncate w-full">{cr.title}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer link to rekap */}
                <div className="bg-slate-50/50 p-4 border-t border-slate-100 text-center select-none">
                  <a
                    href="/parent/reports"
                    className="text-xs font-bold text-emerald-650 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    Lihat Rekap Laporan Lengkap &rarr;
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Attendance Modal (Renders if cookie showNotification is true) */}
      <AttendanceNotificationModal childrenData={childrenData} showNotification={showNotification} />
    </div>
  );
}

// Helpers for Daily and Weekly points calculation
const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

async function getDailyProgression(studentId: number) {
  const dailyLabels: string[] = [];
  const dailyPoints: number[] = [];

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(today.getDate() - 6);
  sixDaysAgo.setHours(0, 0, 0, 0);

  // 1. Sum points before 6 days ago
  const baseActivities = await prisma.activity.aggregate({
    where: {
      studentId,
      createdAt: { lt: sixDaysAgo },
    },
    _sum: { pointsImpact: true },
  });
  let cumulative = baseActivities._sum.pointsImpact || 0;

  // 2. Fetch activities in the last 7 days
  const recentActs = await prisma.activity.findMany({
    where: {
      studentId,
      createdAt: { gte: sixDaysAgo },
    },
    orderBy: { createdAt: 'asc' },
  });

  const earnedByDate: Record<string, number> = {};
  recentActs.forEach((act) => {
    const dateKey = new Date(act.createdAt).toISOString().split('T')[0];
    earnedByDate[dateKey] = (earnedByDate[dateKey] || 0) + act.pointsImpact;
  });

  // Calculate rolling cumulative total
  for (let i = 6; i >= 0; i--) {
    const dateObj = new Date();
    dateObj.setDate(today.getDate() - i);
    const dateKey = dateObj.toISOString().split('T')[0];
    const dayLabel = dayNames[dateObj.getDay()];

    const earned = earnedByDate[dateKey] || 0;
    cumulative += earned;

    dailyLabels.push(dayLabel);
    dailyPoints.push(Math.max(0, cumulative));
  }

  return { dailyLabels, dailyPoints };
}

async function getWeeklyProgression(studentId: number) {
  const weeklyLabels = ['4 Minggu Lalu', '3 Minggu Lalu', '2 Minggu Lalu', 'Minggu Ini'];
  const weeklyPoints: number[] = [];

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(today.getDate() - 28);
  twentyEightDaysAgo.setHours(0, 0, 0, 0);

  // 1. Sum points before 28 days ago
  const baseActivities = await prisma.activity.aggregate({
    where: {
      studentId,
      createdAt: { lt: twentyEightDaysAgo },
    },
    _sum: { pointsImpact: true },
  });
  let cumulative = baseActivities._sum.pointsImpact || 0;

  // 2. Weekly buckets
  for (let w = 3; w >= 0; w--) {
    const start = new Date();
    start.setDate(today.getDate() - ((w + 1) * 7 - 1));
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setDate(today.getDate() - (w * 7));
    end.setHours(23, 59, 59, 999);

    const weekActivities = await prisma.activity.aggregate({
      where: {
        studentId,
        createdAt: { gte: start, lte: end },
      },
      _sum: { pointsImpact: true },
    });
    const earned = weekActivities._sum.pointsImpact || 0;
    cumulative += earned;
    weeklyPoints.push(Math.max(0, cumulative));
  }

  return { weeklyLabels, weeklyPoints };
}

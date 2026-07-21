import React from 'react';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import FaceScanner from '@/components/FaceScanner';

export const dynamic = 'force-dynamic';

export default async function TeacherScanPage() {
  const session = await getSession();
  const className = session?.className;

  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());

  // Fetch students
  const students = await prisma.student.findMany({
    where: className ? { className } : undefined,
    select: {
      id: true,
      name: true,
      studentId: true,
    },
    orderBy: { name: 'asc' },
  });

  // Fetch today's attendances
  const rawTodayAttendances = await prisma.attendance.findMany({
    where: {
      date: todayStr,
      ...(className ? { student: { className } } : {})
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          studentId: true,
          className: true,
          totalPoints: true,
        }
      },
      scannedBy: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      time: 'desc'
    }
  });

  const todayAttendances = rawTodayAttendances.map(att => ({
    id: att.id,
    studentId: att.studentId,
    studentName: att.student.name,
    studentNisn: att.student.studentId,
    className: att.student.className,
    totalPoints: att.student.totalPoints,
    time: att.time,
    status: att.status,
    scannedByName: att.scannedBy?.name || null,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Pemindaian Absensi & Biometrik</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Lakukan pemindaian absensi murid (Kamera Wajah, QR Code, atau Manual) serta lihat log aktivitas absensi hari ini.
        </p>
      </div>

      <FaceScanner students={students} todayAttendances={todayAttendances} />
    </div>
  );
}

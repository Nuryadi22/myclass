import React from 'react';
import { prisma } from '@/lib/db';
import FaceScanner from '@/components/FaceScanner';

export const dynamic = 'force-dynamic';

export default async function TeacherScanPage() {
  // Fetch students
  const students = await prisma.student.findMany({
    select: {
      id: true,
      name: true,
      studentId: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Pemindaian Wajah & Biometrik</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Lakukan pemindaian wajah murid untuk kehadiran otomatis atau daftarkan wajah baru.
        </p>
      </div>

      <FaceScanner students={students} />
    </div>
  );
}

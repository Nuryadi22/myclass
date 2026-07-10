import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import ClassCashManager from '@/components/ClassCashManager';

export const dynamic = 'force-dynamic';

export default async function TeacherCashPage() {
  const session = await getSession();

  if (!session || session.role !== 'teacher') {
    redirect('/');
  }

  const className = session.className;
  if (!className) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-xs text-center text-slate-400 font-bold">
        Akun Guru Anda belum ditautkan dengan kelas binaan manapun. Hubungi Super Admin untuk menautkan kelas.
      </div>
    );
  }

  // Fetch students in this class
  const students = await prisma.student.findMany({
    where: { className },
    orderBy: { name: 'asc' },
  });

  // Fetch cash book transactions
  const transactions = await (prisma as any).classCash.findMany({
    where: { className },
    include: {
      student: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { date: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  // Fetch class bills
  const bills = await (prisma as any).classBill.findMany({
    where: { className },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Keuangan Kelas ({className})</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Kelola pembukuan keuangan kelas binaan Anda, pantau pengeluaran dan pemasukan, atur tagihan siswa, serta cetak laporannya.
        </p>
      </div>

      <ClassCashManager
        className={className}
        students={students.map((s) => ({ id: s.id, name: s.name, studentId: s.studentId }))}
        bills={bills.map((b: any) => ({ id: b.id, title: b.title, amount: b.amount }))}
        initialTransactions={transactions.map((t: any) => ({
          id: t.id,
          className: t.className,
          type: t.type,
          studentId: t.studentId,
          studentName: t.student?.name || null,
          description: t.description,
          amount: t.amount,
          date: t.date,
          photoPath: t.photoPath || null,
        }))}
      />
    </div>
  );
}

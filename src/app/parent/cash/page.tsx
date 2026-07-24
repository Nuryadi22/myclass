import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ParentCashReport from '@/components/ParentCashReport';

export const dynamic = 'force-dynamic';

export default async function ParentCashPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  // Fetch children for this parent
  const children = await prisma.student.findMany({
    where: { parentId: session.userId },
    select: {
      id: true,
      name: true,
      className: true,
    },
  });

  const classNames = children.map((c) => c.className).filter(Boolean);

  // Fetch all transactions for the classes of the parent's children
  const transactions = classNames.length > 0
    ? await (prisma as any).classCash.findMany({
        where: {
          className: { in: classNames },
        },
        include: {
          student: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      })
    : [];

  // Map database transactions to the expected component format
  const mappedTransactions = transactions.map((t: any) => ({
    id: t.id,
    className: t.className,
    type: t.type,
    studentId: t.studentId,
    studentName: t.student ? t.student.name : null,
    description: t.description,
    amount: t.amount,
    date: t.date,
    photoPath: t.photoPath || null,
    cashSource: t.cashSource || null,
  }));

  // Fetch bills for parent classes
  const bills = classNames.length > 0
    ? await (prisma as any).classBill.findMany({
        where: {
          className: { in: classNames },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })
    : [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Keuangan Kelas</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Transparansi pembukuan keuangan kelas anak Anda. Lihat laporan pemasukan, pengeluaran, sisa saldo, dan tagihan wajib.
        </p>
      </div>

      {/* Cash Report Component */}
      <ParentCashReport
        students={children}
        bills={bills.map((b: any) => ({ id: b.id, className: b.className, title: b.title, amount: b.amount }))}
        initialTransactions={mappedTransactions}
      />
    </div>
  );
}

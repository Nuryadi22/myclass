import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import GradeManager from '@/components/GradeManager';

export const dynamic = 'force-dynamic';

export default async function TeacherGradesPage() {
  const session = await getSession();
  const className = session?.className;

  // Fetch students in this class
  const students = await prisma.student.findMany({
    where: className ? { className } : undefined,
    select: {
      id: true,
      name: true,
      studentId: true,
    },
    orderBy: { name: 'asc' },
  });

  // Fetch all grades for this class
  const rawGrades = await prisma.grade.findMany({
    where: {
      student: className ? { className } : undefined,
    },
    include: {
      student: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ subject: 'asc' }, { material: 'asc' }, { createdAt: 'asc' }],
  });

  const grades = rawGrades.map((g) => ({
    id: g.id,
    studentId: g.studentId,
    studentName: g.student.name,
    subject: g.subject,
    material: g.material,
    score: g.score,
    createdAt: g.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      <GradeManager students={students} grades={grades} />
    </div>
  );
}

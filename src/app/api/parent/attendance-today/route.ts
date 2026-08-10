import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());

    const children = await prisma.student.findMany({
      where: { parentId: session.userId },
      select: { id: true, name: true },
    });

    const childIds = children.map((c) => c.id);

    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: { in: childIds },
        date: todayStr,
      },
      select: {
        id: true,
        studentId: true,
        date: true,
        time: true,
        status: true,
        updatedAt: true,
      },
    });

    const result = children.map((child) => {
      const att = attendances.find((a) => a.studentId === child.id);
      return {
        studentId: child.id,
        studentName: child.name,
        attendance: att
          ? {
              id: att.id,
              time: att.time,
              status: att.status,
              updatedAt: att.updatedAt.toISOString(),
            }
          : null,
      };
    });

    return NextResponse.json({ children: result });
  } catch (error) {
    console.error('Parent attendance check error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    if (!studentId) {
      return new NextResponse('Student ID is required', { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { studentId: studentId.trim() },
      select: { faceImage: true },
    });

    if (!student || !student.faceImage) {
      return new NextResponse('Face image not found', { status: 404 });
    }

    let base64 = student.faceImage;
    if (base64.startsWith('data:')) {
      base64 = base64.split(',')[1];
    }

    const buffer = Buffer.from(base64, 'base64');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error fetching face image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

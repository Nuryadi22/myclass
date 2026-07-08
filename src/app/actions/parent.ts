'use server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function storePrayerAction(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'parent') {
    return { error: 'Akses ditolak.' };
  }

  const studentIdStr = formData.get('student_id') as string;
  const studentId = parseInt(studentIdStr, 10);
  const date = formData.get('date') as string; // YYYY-MM-DD
  const notes = formData.get('notes') as string | null;

  const subuh = formData.get('subuh') === 'on';
  const dzuhur = formData.get('dzuhur') === 'on';
  const ashar = formData.get('ashar') === 'on';
  const maghrib = formData.get('maghrib') === 'on';
  const isya = formData.get('isya') === 'on';

  if (!studentId || !date) {
    return { error: 'Murid dan Tanggal wajib diisi.' };
  }

  try {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return { error: 'Murid tidak ditemukan.' };
    }

    // Check ownership
    if (student.parentId !== session.userId) {
      return { error: 'Akses ilegal. Murid ini bukan anak Anda.' };
    }

    // Check existing prayer record
    const existingPrayer = await prisma.prayer.findFirst({
      where: {
        studentId: studentId,
        date: date,
      },
    });

    const oldScore = existingPrayer
      ? [existingPrayer.subuh, existingPrayer.dzuhur, existingPrayer.ashar, existingPrayer.maghrib, existingPrayer.isya].filter(Boolean).length
      : 0;

    const newScore = [subuh, dzuhur, ashar, maghrib, isya].filter(Boolean).length;

    // Point adjustment difference
    const diff = newScore - oldScore;

    // Parse date for title "Laporan Shalat Mandiri: DD-MM-YYYY"
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}-${month}-${year}`;
    const activityTitle = `Laporan Shalat Mandiri: ${formattedDate}`;

    await prisma.$transaction(async (tx) => {
      // 1. Save or update prayer record
      if (existingPrayer) {
        await tx.prayer.update({
          where: { id: existingPrayer.id },
          data: {
            subuh,
            dzuhur,
            ashar,
            maghrib,
            isya,
            notes: notes ? notes.trim() : null,
          },
        });
      } else {
        await tx.prayer.create({
          data: {
            studentId,
            parentId: session.userId,
            date,
            subuh,
            dzuhur,
            ashar,
            maghrib,
            isya,
            notes: notes ? notes.trim() : null,
          },
        });
      }

      // 2. Adjust student total points
      if (diff !== 0) {
        const updatedPoints = Math.max(0, student.totalPoints + diff);
        await tx.student.update({
          where: { id: studentId },
          data: { totalPoints: updatedPoints },
        });
      }

      // 3. Update or create activity log
      if (newScore > 0 || oldScore > 0) {
        const existingActivity = await tx.activity.findFirst({
          where: {
            studentId: studentId,
            type: 'prayer',
            title: activityTitle,
          },
        });

        if (existingActivity) {
          await tx.activity.update({
            where: { id: existingActivity.id },
            data: {
              rating: newScore,
              pointsImpact: newScore,
            },
          });
        } else {
          await tx.activity.create({
            data: {
              studentId: studentId,
              type: 'prayer',
              title: activityTitle,
              rating: newScore,
              pointsImpact: newScore,
            },
          });
        }
      }
    });

    revalidatePath('/parent/prayer');
    revalidatePath('/parent/dashboard');
    return { success: true, message: 'Kegiatan shalat anak berhasil disimpan. Poin keaktifan diperbarui.' };
  } catch (error: any) {
    console.error('Store prayer error:', error);
    return { error: 'Gagal mencatat kegiatan shalat. Silakan coba lagi.' };
  }
}

export async function storeAttendanceRequestAction(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'parent') {
    return { error: 'Akses ditolak.' };
  }

  const studentIdStr = formData.get('student_id') as string;
  const studentId = parseInt(studentIdStr, 10);
  const status = formData.get('status') as string; // 'sick' or 'excused'
  const reason = formData.get('reason') as string;
  const date = formData.get('date') as string; // YYYY-MM-DD
  const imageFile = formData.get('photo') as File | null;

  if (!studentId || !status || !date) {
    return { error: 'Murid, Status, dan Tanggal wajib diisi.' };
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student || student.parentId !== session.userId) {
      return { error: 'Murid tidak ditemukan atau data tidak valid.' };
    }

    let photoPath: string | null = null;

    if (imageFile && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const filename = `${Date.now()}_${imageFile.name.replace(/\s+/g, '_')}`;
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'attendance');
      await mkdir(uploadDir, { recursive: true });

      const filePath = join(uploadDir, filename);
      await writeFile(filePath, buffer);

      photoPath = `uploads/attendance/${filename}`;
    }

    await prisma.parentAttendanceRequest.create({
      data: {
        studentId,
        parentId: session.userId,
        date,
        status,
        reason: reason ? reason.trim() : null,
        photoPath,
        statusApproval: 'pending'
      }
    });

    revalidatePath('/parent/dashboard');
    revalidatePath('/teacher/dashboard');

    return { success: true, message: 'Pengajuan absensi (izin/sakit) berhasil dikirim. Menunggu persetujuan guru kelas.' };
  } catch (error: any) {
    console.error('Store attendance request error:', error);
    return { error: 'Gagal mengirim pengajuan. Silakan coba lagi.' };
  }
}

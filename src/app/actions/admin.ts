'use server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function storeTeacherAction(prevState: any, formData: FormData) {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    return { error: 'Akses ditolak.' };
  }

  const name = formData.get('name') as string;
  const username = formData.get('username') as string; // NIG
  const className = formData.get('class_name') as string;
  const appTitle = formData.get('app_title') as string;

  if (!name || !username || !className) {
    return { error: 'Semua kolom wajib diisi.' };
  }

  try {
    // Check if username/NIG unique
    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (existing) {
      return { error: 'Username / Nomor Induk Guru (NIG) sudah terdaftar.' };
    }

    // Default password is NIG
    const defaultPassword = await hashPassword(username.trim());

    await prisma.user.create({
      data: {
        name: name.trim(),
        username: username.trim(),
        password: defaultPassword,
        role: 'teacher',
        className: className.trim(),
        appTitle: appTitle ? appTitle.trim() : null,
      },
    });

    revalidatePath('/admin/teachers');
    return { success: true, message: 'Data Guru berhasil disimpan. Username & Password adalah No Induk Guru (NIG).' };
  } catch (error: any) {
    console.error('Store teacher error:', error);
    return { error: 'Gagal menyimpan data guru. Silakan coba lagi.' };
  }
}

export async function destroyTeacherAction(teacherId: number) {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    return { error: 'Akses ditolak.' };
  }

  try {
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return { error: 'Data guru tidak ditemukan.' };
    }

    if (teacher.role !== 'teacher') {
      return { error: 'Akses ilegal. Anda hanya dapat menghapus akun guru.' };
    }

    await prisma.user.delete({
      where: { id: teacherId },
    });

    revalidatePath('/admin/teachers');
    return { success: true, message: 'Data Guru berhasil dihapus.' };
  } catch (error: any) {
    console.error('Delete teacher error:', error);
    return { error: 'Gagal menghapus data guru. Silakan coba lagi.' };
  }
}

export async function resetAllDataAction() {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    return { error: 'Akses ditolak.' };
  }

  try {
    const { readdir, unlink } = await import('fs/promises');
    const { join } = await import('path');

    // Helper to clear directories
    const clearDirectory = async (dirPath: string) => {
      try {
        const files = await readdir(dirPath);
        for (const file of files) {
          if (file !== '.keep' && file !== '.gitkeep') {
            await unlink(join(dirPath, file));
          }
        }
      } catch (err) {
        // Ignore if dir doesn't exist
      }
    };

    // 1. Reclaim database storage capacity (TRUNCATE releases storage memory immediately in Postgres)
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "Student", "Attendance", "Activity", "Creativity", "Prayer", "Discussion", "ParentAttendanceRequest", "ClassCash" RESTART IDENTITY CASCADE;`
    );

    // 2. Delete parent users
    await prisma.user.deleteMany({
      where: { role: 'parent' },
    });

    // 3. Clear file storage capacity (uploaded images)
    await clearDirectory(join(process.cwd(), 'public', 'faces'));
    await clearDirectory(join(process.cwd(), 'public', 'creativity'));
    await clearDirectory(join(process.cwd(), 'public', 'uploads', 'attendance'));

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/teachers');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/students');
    revalidatePath('/teacher/scan');
    revalidatePath('/teacher/activity');
    revalidatePath('/teacher/creativity');
    revalidatePath('/teacher/punishment');
    revalidatePath('/teacher/cash');
    revalidatePath('/teacher/reports');
    revalidatePath('/parent/dashboard');
    revalidatePath('/parent/prayer');
    revalidatePath('/parent/cash');
    revalidatePath('/parent/reports');
    revalidatePath('/discussions');

    return { success: true, message: 'Semua data murid, absensi, keaktifan, kas kelas, wali murid, dan file gambar berhasil di-reset bersih.' };
  } catch (error: any) {
    console.error('Reset all data error:', error);
    return { error: 'Gagal melakukan reset data. Silakan coba lagi.' };
  }
}

export async function resetTeacherDataAction(teacherId: number) {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    return { error: 'Akses ditolak.' };
  }

  try {
    const { unlink } = await import('fs/promises');
    const { join } = await import('path');

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher || teacher.role !== 'teacher' || !teacher.className) {
      return { error: 'Guru tidak ditemukan atau tidak memiliki kelas binaan.' };
    }

    const className = teacher.className;

    // Find all students in this class
    const students = await prisma.student.findMany({
      where: { className },
      select: { id: true, studentId: true, parentId: true },
    });

    const studentDbIds = students.map((s) => s.id);
    const parentIds = students.map((s) => s.parentId).filter((id): id is number => id !== null);

    // Get list of creativity images to delete
    const creativities = await prisma.creativity.findMany({
      where: { studentId: { in: studentDbIds } },
      select: { imagePath: true },
    });

    await prisma.$transaction(async (tx) => {
      // 1. Delete all students of this class (cascades to attendance, activities, prayers, creativities)
      await tx.student.deleteMany({
        where: { className },
      });

      // 2. Delete class cash records of this class (including non-student expenses)
      await tx.classCash.deleteMany({
        where: { className },
      });

      // 3. Delete parent accounts if they have no other children in other classes
      if (parentIds.length > 0) {
        const parentsWithOtherChildren = await tx.student.findMany({
          where: {
            parentId: { in: parentIds },
            className: { not: className },
          },
          select: { parentId: true },
        });

        const parentIdsWithOtherChildren = parentsWithOtherChildren
          .map((s) => s.parentId)
          .filter((id): id is number => id !== null);

        const parentIdsToDelete = parentIds.filter((id) => !parentIdsWithOtherChildren.includes(id));

        if (parentIdsToDelete.length > 0) {
          await tx.user.deleteMany({
            where: {
              id: { in: parentIdsToDelete },
              role: 'parent',
            },
          });
        }
      }
    });

    // Clean up physical file storage for the deleted students
    // A. Delete face biometrics files
    for (const student of students) {
      try {
        const facePath = join(process.cwd(), 'public', 'faces', `${student.studentId}.jpg`);
        await unlink(facePath);
      } catch (err) {
        // Ignore if file doesn't exist
      }
    }

    // B. Delete creativity image files
    for (const cr of creativities) {
      try {
        const creativityPath = join(process.cwd(), 'public', cr.imagePath);
        await unlink(creativityPath);
      } catch (err) {
        // Ignore if file doesn't exist
      }
    }

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/teachers');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/students');
    revalidatePath('/teacher/scan');
    revalidatePath('/teacher/activity');
    revalidatePath('/teacher/creativity');
    revalidatePath('/teacher/punishment');
    revalidatePath('/teacher/cash');
    revalidatePath('/teacher/reports');
    revalidatePath('/parent/dashboard');
    revalidatePath('/parent/prayer');
    revalidatePath('/parent/cash');
    revalidatePath('/parent/reports');
    revalidatePath('/discussions');

    return { success: true, message: `Semua data kelas ${className} dan file gambar terkait berhasil di-reset bersih.` };
  } catch (error: any) {
    console.error('Reset teacher data error:', error);
    return { error: 'Gagal mereset data kelas guru. Silakan coba lagi.' };
  }
}

'use server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { join } from 'path';

// Helper to generate random string for QR Code Token
function generateQrToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randomStr = '';
  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `STU-${randomStr}-${randomNum}`;
}

// 1. Add Student
export async function storeStudentAction(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  const name = formData.get('name') as string;
  const studentId = formData.get('student_id') as string; // NISN
  const parentName = formData.get('parent_name') as string;

  if (!name || !studentId || !parentName) {
    return { error: 'Semua kolom wajib diisi.' };
  }

  try {
    // Check unique student_id (NISN)
    const existingStudent = await prisma.student.findUnique({
      where: { studentId: studentId.trim() },
    });

    if (existingStudent) {
      return { error: 'NISN Murid sudah terdaftar.' };
    }

    // Find or create Parent account using NISN as username and password
    let parent = await prisma.user.findFirst({
      where: { username: studentId.trim(), role: 'parent' },
    });

    if (!parent) {
      const defaultPassword = await hashPassword(studentId.trim());
      parent = await prisma.user.create({
        data: {
          name: parentName.trim(),
          username: studentId.trim(),
          password: defaultPassword,
          role: 'parent',
        },
      });
    } else {
      // Update parent name if already exists
      parent = await prisma.user.update({
        where: { id: parent.id },
        data: { name: parentName.trim() },
      });
    }

    const qrCodeToken = generateQrToken();
    const className = session.className || 'Tanpa Kelas';

    const faceImage = formData.get('face_image') as string | null;
    let savedFaceImage: string | null = null;
    if (faceImage && faceImage.startsWith('data:image')) {
      savedFaceImage = faceImage;
    }

    await prisma.student.create({
      data: {
        name: name.trim(),
        studentId: studentId.trim(),
        className: className,
        parentId: parent.id,
        qrCodeToken: qrCodeToken,
        totalPoints: 0,
        faceImage: savedFaceImage,
      },
    });

    revalidatePath('/teacher/students');
    return {
      success: true,
      message: `Murid berhasil ditambahkan. Akun Orang Tua otomatis dibuat dengan Username & Password NISN: ${studentId}`,
    };
  } catch (error: any) {
    console.error('Store student error:', error);
    return { error: 'Gagal menambahkan murid. Silakan coba lagi.' };
  }
}

// 2. Record Attendance (handles QR Scan, Manual Input, and Face Scan)
export async function recordAttendanceAction(data: {
  qr_code_token?: string;
  student_id?: string;
  status?: string;
  isFaceScan?: boolean;
}) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { success: false, message: 'Akses ditolak.' };
  }

  try {
    let student = null;
    let status = 'present';

    if (data.student_id) {
      // Manual Input or Face Scan
      student = await prisma.student.findUnique({
        where: { studentId: data.student_id.trim() },
      });

      if (!student) {
        return { success: false, message: 'NISN Murid tidak ditemukan.' };
      }

      if (data.isFaceScan) {
        // Face Scan auto-status (no late check)
        status = 'present';
      } else {
        const inputStatus = data.status ? data.status.toLowerCase() : 'hadir';
        if (inputStatus === 'hadir' || inputStatus === 'present') {
          status = 'present';
        } else if (inputStatus === 'sakit' || inputStatus === 'sick') {
          status = 'sick';
        } else if (inputStatus === 'izin' || inputStatus === 'excused') {
          status = 'excused';
        } else if (inputStatus === 'alfa' || inputStatus === 'absent') {
          status = 'absent';
        } else {
          status = 'present';
        }
      }
    } else {
      // QR Code Scan
      if (!data.qr_code_token) {
        return { success: false, message: 'QR Code Token atau NISN wajib diisi.' };
      }

      student = await prisma.student.findUnique({
        where: { qrCodeToken: data.qr_code_token.trim() },
      });

      if (!student) {
        return { success: false, message: 'QR Code Murid tidak terdaftar.' };
      }

      // No late check, always present
      status = 'present';
    }

    const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date()); // YYYY-MM-DD in WIB
    
    const wibParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(new Date());
    const wibPartMap = Object.fromEntries(wibParts.map(p => [p.type, p.value]));
    let wibHour = parseInt(wibPartMap.hour, 10);
    if (wibHour === 24) wibHour = 0;
    const nowTimeStr = `${wibHour.toString().padStart(2, '0')}:${wibPartMap.minute}:${wibPartMap.second}`;

    // Check if already checked in today
    const alreadyChecked = await prisma.attendance.findFirst({
      where: {
        studentId: student.id,
        date: todayStr,
      },
    });

    if (alreadyChecked) {
      if (data.student_id) {
        // Allow status updates for manual input
        const oldStatus = alreadyChecked.status;

        await prisma.$transaction(async (tx) => {
          await tx.attendance.update({
            where: { id: alreadyChecked.id },
            data: {
              status: status,
              time: nowTimeStr,
              scannedById: session.userId,
            },
          });

          if (oldStatus !== status) {
            // Revert old points
            let diff = 0;
            if (oldStatus === 'present' || oldStatus === 'late') {
              diff -= 1;
            } else if (oldStatus === 'absent') {
              diff += 1;
            }
            // Add new points
            if (status === 'present' || status === 'late') {
              diff += 1;
            } else if (status === 'absent') {
              diff -= 1;
            }

            if (diff !== 0) {
              const curStudent = await tx.student.findUnique({
                where: { id: student.id },
                select: { totalPoints: true }
              });
              const newPoints = Math.max(0, (curStudent?.totalPoints || 0) + diff);
              await tx.student.update({
                where: { id: student.id },
                data: { totalPoints: newPoints }
              });
            }
          }
        });

        let label = 'Hadir';
        if (status === 'sick') label = 'Sakit';
        else if (status === 'excused') label = 'Izin';
        else if (status === 'absent') label = 'Alfa';
        else if (status === 'late') label = 'Terlambat';

        revalidatePath('/teacher/dashboard');
        revalidatePath('/teacher/scan');
        revalidatePath('/teacher/students');
        revalidatePath('/teacher/reports');
        revalidatePath(`/teacher/reports/${student.id}`);
        revalidatePath('/parent/dashboard');
        revalidatePath('/parent/reports');

        return {
          success: true,
          message: `Kehadiran ${student.name} berhasil diperbarui menjadi ${label}.`,
          studentName: student.name,
          time: nowTimeStr.substring(0, 5),
          status: status,
        };
      }

      return {
        success: false,
        message: `${student.name} sudah melakukan absensi hari ini pada pukul ${alreadyChecked.time.substring(0, 5)} WIB.`,
      };
    }

    // Create new attendance atomically
    let diff = 0;
    if (status === 'present' || status === 'late') {
      diff += 1;
    } else if (status === 'absent') {
      diff -= 1;
    }

    await prisma.$transaction(async (tx) => {
      await tx.attendance.create({
        data: {
          studentId: student.id,
          date: todayStr,
          time: nowTimeStr,
          status: status,
          scannedById: session.userId,
        },
      });

      if (diff !== 0) {
        const curStudent = await tx.student.findUnique({
          where: { id: student.id },
          select: { totalPoints: true }
        });
        const newPoints = Math.max(0, (curStudent?.totalPoints || 0) + diff);
        await tx.student.update({
          where: { id: student.id },
          data: { totalPoints: newPoints }
        });
      }
    });

    let label = 'Hadir';
    if (status === 'sick') label = 'Sakit';
    else if (status === 'excused') label = 'Izin';
    else if (status === 'absent') label = 'Alfa';
    else if (status === 'late') label = 'Terlambat';

    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/scan');
    revalidatePath('/teacher/students');
    revalidatePath('/teacher/reports');
    revalidatePath(`/teacher/reports/${student.id}`);
    revalidatePath('/parent/dashboard');
    revalidatePath('/parent/reports');

    return {
      success: true,
      message: `Absensi berhasil direkam untuk ${student.name} (${label}).`,
      studentName: student.name,
      time: nowTimeStr.substring(0, 5),
      status: status,
    };
  } catch (error: any) {
    console.error('Attendance record error:', error);
    return { success: false, message: 'Gagal merekam absensi. Terjadi kesalahan sistem.' };
  }
}

// 3. Add Student Activity
export async function storeActivityAction(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  const studentIdStr = formData.get('student_id') as string;
  const studentId = parseInt(studentIdStr, 10);
  const type = formData.get('type') as string;
  const title = formData.get('title') as string;
  const ratingStr = formData.get('rating') as string;
  const rating = parseInt(ratingStr, 10);

  if (!studentId || !type || !title || !rating) {
    return { error: 'Semua kolom wajib diisi.' };
  }

  try {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return { error: 'Murid tidak ditemukan.' };
    }

    const pointsImpact = rating; // 1 star = 1 point

    await prisma.$transaction([
      prisma.activity.create({
        data: {
          studentId: studentId,
          teacherId: session.userId,
          type: type,
          title: title.trim(),
          rating: rating,
          pointsImpact: pointsImpact,
        },
      }),
      prisma.student.update({
        where: { id: studentId },
        data: { totalPoints: { increment: pointsImpact } },
      }),
    ]);

    revalidatePath('/teacher/activity');
    return { success: true, message: 'Aktivitas keaktifan murid berhasil ditambahkan.' };
  } catch (error: any) {
    console.error('Store activity error:', error);
    return { error: 'Gagal menambahkan aktivitas. Silakan coba lagi.' };
  }
}

// 4. Add Creativity (with file upload, supports multiple students)
export async function storeCreativityAction(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;
  const pointsAwardedStr = formData.get('points_awarded') as string;
  const pointsAwarded = parseInt(pointsAwardedStr, 10);
  const imageFile = formData.get('image') as File | null;

  // Supports multiple students (sent as student_ids array or single student_id)
  const studentIdStr = formData.get('student_id') as string | null;
  const studentIdsStr = formData.getAll('student_ids') as string[];

  let studentIds: number[] = [];
  if (studentIdStr) {
    studentIds.push(parseInt(studentIdStr, 10));
  } else if (studentIdsStr && studentIdsStr.length > 0) {
    studentIds = studentIdsStr.map((id) => parseInt(id, 10));
  }

  if (studentIds.length === 0) {
    return { error: 'Anda harus memilih setidaknya satu murid.' };
  }

  if (!title || !pointsAwarded || !imageFile || imageFile.size === 0) {
    return { error: 'Kolom Judul, Poin, dan File Gambar wajib diisi.' };
  }

  try {
    // Write image to public/creativity directory
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `${Date.now()}_${imageFile.name.replace(/\s+/g, '_')}`;
    const uploadDir = join(process.cwd(), 'public', 'creativity');
    await mkdir(uploadDir, { recursive: true });

    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const imagePath = `creativity/${filename}`;

    // Loop through student IDs to create records
    for (const id of studentIds) {
      await prisma.$transaction([
        prisma.creativity.create({
          data: {
            studentId: id,
            teacherId: session.userId,
            title: title.trim(),
            imagePath: imagePath,
            description: description ? description.trim() : null,
            pointsAwarded: pointsAwarded,
          },
        }),
        prisma.student.update({
          where: { id: id },
          data: { totalPoints: { increment: pointsAwarded } },
        }),
        prisma.activity.create({
          data: {
            studentId: id,
            teacherId: session.userId,
            type: 'creativity',
            title: `Mengunggah Karya Kreativitas: ${title.trim()}`,
            pointsImpact: pointsAwarded,
          },
        }),
      ]);
    }

    revalidatePath('/teacher/creativity');
    return { success: true, message: 'Kreativitas murid berhasil diunggah.' };
  } catch (error: any) {
    console.error('Store creativity error:', error);
    return { error: 'Gagal mengunggah kreativitas. Silakan coba lagi.' };
  }
}

// 5. Add Punishment
export async function storePunishmentAction(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  const studentIdStr = formData.get('student_id') as string;
  const studentId = parseInt(studentIdStr, 10);
  const title = formData.get('title') as string; // reason
  const pointsDeductedStr = formData.get('points_deducted') as string;
  const pointsDeducted = parseInt(pointsDeductedStr, 10);

  if (!studentId || !title || !pointsDeducted) {
    return { error: 'Semua kolom wajib diisi.' };
  }

  try {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return { error: 'Murid tidak ditemukan.' };
    }

    const pointsImpact = -pointsDeducted;
    const newPoints = Math.max(0, student.totalPoints - pointsDeducted);

    await prisma.$transaction([
      prisma.activity.create({
        data: {
          studentId: studentId,
          teacherId: session.userId,
          type: 'punishment',
          title: title.trim(),
          pointsImpact: pointsImpact,
        },
      }),
      prisma.student.update({
        where: { id: studentId },
        data: { totalPoints: newPoints },
      }),
    ]);

    revalidatePath('/teacher/punishment');
    return { success: true, message: 'Pengurangan poin hukuman berhasil dicatat.' };
  } catch (error: any) {
    console.error('Store punishment error:', error);
    return { error: 'Gagal mencatat punishment. Silakan coba lagi.' };
  }
}

// 6. Delete Creativity record and adjust student points
export async function destroyCreativityAction(creativityId: number) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  try {
    const creativity = await prisma.creativity.findUnique({
      where: { id: creativityId },
      include: { student: true }
    });

    if (!creativity) {
      return { error: 'Karya kreativitas tidak ditemukan.' };
    }

    const pointsDeducted = creativity.pointsAwarded;
    const newPoints = Math.max(0, creativity.student.totalPoints - pointsDeducted);

    await prisma.$transaction(async (tx) => {
      // 1. Delete creativity record
      await tx.creativity.delete({
        where: { id: creativityId }
      });

      // 2. Decrement student totalPoints
      await tx.student.update({
        where: { id: creativity.studentId },
        data: { totalPoints: newPoints }
      });

      // 3. Delete corresponding activity log
      await tx.activity.deleteMany({
        where: {
          studentId: creativity.studentId,
          type: 'creativity',
          title: `Mengunggah Karya Kreativitas: ${creativity.title}`,
          pointsImpact: pointsDeducted
        }
      });
    });

    // Try to delete image file from disk
    try {
      const filePath = join(process.cwd(), 'public', creativity.imagePath);
      await unlink(filePath);
    } catch (err) {
      console.warn('Could not delete creativity file on disk:', err);
    }

    revalidatePath('/teacher/creativity');
    revalidatePath(`/teacher/reports/${creativity.studentId}`);
    revalidatePath('/teacher/dashboard');
    revalidatePath('/parent/dashboard');
    revalidatePath('/parent/reports');

    return { success: true, message: 'Karya kreativitas berhasil dihapus dan poin murid disesuaikan.' };
  } catch (error: any) {
    console.error('Delete creativity error:', error);
    return { error: 'Gagal menghapus karya kreativitas. Silakan coba lagi.' };
  }
}

export async function approveOrRejectAttendanceAction(requestId: number, statusApproval: string) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  try {
    const request = await prisma.parentAttendanceRequest.findUnique({
      where: { id: requestId },
      include: { student: true }
    });

    if (!request) {
      return { error: 'Pengajuan absensi tidak ditemukan.' };
    }

    if (request.student.className !== session.className) {
      return { error: 'Akses ditolak. Murid ini bukan kelas Anda.' };
    }

    if (statusApproval === 'approved') {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);

      await prisma.$transaction(async (tx) => {
        // 1. Update request status
        await tx.parentAttendanceRequest.update({
          where: { id: requestId },
          data: { statusApproval: 'approved' }
        });

        // 2. Upsert Attendance
        const existingAttendance = await tx.attendance.findFirst({
          where: {
            studentId: request.studentId,
            date: request.date
          }
        });

        if (existingAttendance) {
          const oldStatus = existingAttendance.status;
          await tx.attendance.update({
            where: { id: existingAttendance.id },
            data: {
              status: request.status,
              time: timeStr,
              scannedById: session.userId
            }
          });

          // Adjust points if status changed
          let diff = 0;
          if (oldStatus === 'present' || oldStatus === 'late') diff -= 1;
          else if (oldStatus === 'absent') diff += 1;

          if (request.status === 'present' || request.status === 'late') diff += 1;
          else if (request.status === 'absent') diff -= 1;

          if (diff !== 0) {
            const curStudent = await tx.student.findUnique({
              where: { id: request.studentId },
              select: { totalPoints: true }
            });
            const newPoints = Math.max(0, (curStudent?.totalPoints || 0) + diff);
            await tx.student.update({
              where: { id: request.studentId },
              data: { totalPoints: newPoints }
            });
          }
        } else {
          await tx.attendance.create({
            data: {
              studentId: request.studentId,
              date: request.date,
              time: timeStr,
              status: request.status,
              scannedById: session.userId
            }
          });

          let diff = 0;
          if (request.status === 'present' || request.status === 'late') diff += 1;
          else if (request.status === 'absent') diff -= 1;

          if (diff !== 0) {
            const curStudent = await tx.student.findUnique({
              where: { id: request.studentId },
              select: { totalPoints: true }
            });
            const newPoints = Math.max(0, (curStudent?.totalPoints || 0) + diff);
            await tx.student.update({
              where: { id: request.studentId },
              data: { totalPoints: newPoints }
            });
          }
        }
      });
    } else {
      await prisma.parentAttendanceRequest.update({
        where: { id: requestId },
        data: { statusApproval: 'rejected' }
      });
    }

    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/scan');
    revalidatePath('/teacher/students');
    revalidatePath('/teacher/reports');
    revalidatePath('/parent/dashboard');
    revalidatePath('/parent/reports');
    revalidatePath(`/teacher/reports/${request.studentId}`);

    return { success: true, message: `Pengajuan absensi berhasil di-${statusApproval === 'approved' ? 'setujui' : 'tolak'}.` };
  } catch (error: any) {
    console.error('Approve/Reject attendance request error:', error);
    return { error: 'Gagal memproses pengajuan. Silakan coba lagi.' };
  }
}

export async function storeCashTransactionAction(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  const className = session.className;
  if (!className) {
    return { error: 'Anda belum terdaftar di kelas manapun.' };
  }

  const type = formData.get('type') as string; // 'income' or 'expense'
  const amountStr = formData.get('amount') as string;
  const amount = parseFloat(amountStr);
  const date = formData.get('date') as string; // YYYY-MM-DD
  const description = formData.get('description') as string;
  const studentIdStr = formData.get('student_id') as string | null;
  const cashSource = formData.get('cash_source') as string | null;

  if (!type || isNaN(amount) || amount <= 0 || !date || !description) {
    return { error: 'Nominal, Tanggal, dan Keterangan wajib diisi dengan benar.' };
  }

  let studentId: number | null = null;
  if (type === 'income') {
    if (!studentIdStr) {
      return { error: 'Murid wajib dipilih untuk jenis transaksi pemasukan.' };
    }
    if (studentIdStr !== 'other') {
      studentId = parseInt(studentIdStr, 10);
    }
  }

  try {
    let photoPath: string | null = null;

    if (type === 'expense') {
      const photoFile = formData.get('photo_file') as File | null;
      const photoBase64 = formData.get('photo_base64') as string | null;

      if (photoFile && photoFile.size > 0) {
        const bytes = await photoFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        photoPath = `data:${photoFile.type};base64,${base64}`;
      } else if (photoBase64 && photoBase64.startsWith('data:image')) {
        photoPath = photoBase64;
      }
    }

    await prisma.classCash.create({
      data: {
        className,
        type,
        amount,
        date,
        description: description.trim(),
        studentId,
        photoPath,
        cashSource: type === 'expense' ? cashSource : null,
      } as any
    });

    revalidatePath('/teacher/cash');
    return { success: true, message: 'Transaksi kas kelas berhasil dicatat.' };
  } catch (error: any) {
    console.error('Store class cash error:', error);
    return { error: 'Gagal mencatat transaksi kas. Silakan coba lagi.' };
  }
}

export async function deleteCashTransactionAction(transactionId: number) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  try {
    const transaction = await (prisma as any).classCash.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      return { error: 'Transaksi tidak ditemukan.' };
    }

    if (transaction.className !== session.className) {
      return { error: 'Akses ditolak. Transaksi ini bukan milik kelas Anda.' };
    }

    if (transaction.photoPath && !transaction.photoPath.startsWith('data:image')) {
      try {
        const filePath = join(process.cwd(), 'public', transaction.photoPath);
        await unlink(filePath);
      } catch (err) {
        console.warn('Could not delete expense receipt file on disk:', err);
      }
    }

    await (prisma as any).classCash.delete({
      where: { id: transactionId }
    });

    revalidatePath('/teacher/cash');
    return { success: true, message: 'Transaksi kas kelas berhasil dihapus.' };
  } catch (error: any) {
    console.error('Delete class cash error:', error);
    return { error: 'Gagal menghapus transaksi kas. Silakan coba lagi.' };
  }
}

// 7. Register Student Face
export async function registerStudentFaceAction(studentId: string, imageBase64: string) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  if (!studentId || !imageBase64) {
    return { error: 'ID Murid dan data gambar wajib diisi.' };
  }

  try {
    // Save/update the faceImage field in database instead of file system
    await prisma.student.update({
      where: { studentId: studentId.trim() },
      data: { faceImage: imageBase64 },
    });

    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/scan');
    revalidatePath('/teacher/students');
    return { success: true, message: 'Wajah murid berhasil didaftarkan.' };
  } catch (error: any) {
    console.error('Register face error:', error);
    return { error: 'Gagal menyimpan data wajah murid.' };
  }
}

// 8. Get List of Students with Registered Faces
export async function getRegisteredFacesAction() {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.', studentIds: [], registeredStudents: [] };
  }

  try {
    // Query database for students that have faceImage stored
    const students = await prisma.student.findMany({
      where: {
        faceImage: {
          not: null,
        },
      },
      select: {
        studentId: true,
        faceImage: true,
      },
    });

    const studentIds = students.map((s) => s.studentId);
    return { 
      success: true, 
      studentIds, 
      registeredStudents: students as { studentId: string; faceImage: string }[] 
    };
  } catch (error: any) {
    console.error('Get registered faces error:', error);
    return { success: false, studentIds: [], registeredStudents: [] };
  }
}

// 9. Delete Student
export async function deleteStudentAction(id: number) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      return { error: 'Murid tidak ditemukan.' };
    }

    // Delete student record (cascade deletes related data in DB due to schema rules)
    await prisma.student.delete({
      where: { id },
    });

    // Try to delete their face biometrics file from disk
    try {
      const filePath = join(process.cwd(), 'public', 'faces', `${student.studentId}.jpg`);
      await unlink(filePath);
    } catch (err) {
      // Ignore if file doesn't exist
    }

    revalidatePath('/teacher/students');
    revalidatePath('/teacher/dashboard');
    return { success: true, message: `Murid ${student.name} berhasil dihapus.` };
  } catch (error: any) {
    console.error('Delete student error:', error);
    return { error: 'Gagal menghapus murid. Silakan coba lagi.' };
  }
}

// Action to award 1 active point to a student via QR scan in Keaktifan (Poinku)
export async function awardActivePointAction(qrCodeToken: string) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { success: false, message: 'Akses ditolak.' };
  }

  try {
    const student = await prisma.student.findUnique({
      where: { qrCodeToken: qrCodeToken.trim() }
    });

    if (!student) {
      return { success: false, message: 'QR Code Murid tidak terdaftar.' };
    }

    const pointsImpact = 1;
    await prisma.$transaction([
      prisma.activity.create({
        data: {
          studentId: student.id,
          teacherId: session.userId,
          type: 'memorization', // Defaulting to memorization/activity log type
          title: 'Aktivitas Poinku (Scan QR)',
          rating: 1,
          pointsImpact: pointsImpact,
        },
      }),
      prisma.student.update({
        where: { id: student.id },
        data: { totalPoints: { increment: pointsImpact } },
      }),
    ]);

    revalidatePath('/teacher/activity');
    revalidatePath('/teacher/dashboard');
    return { success: true, message: `Berhasil menambahkan 1 Poin Bintang untuk ${student.name}.`, studentName: student.name };
  } catch (error: any) {
    console.error('Award active point error:', error);
    return { success: false, message: 'Gagal menambahkan poin. Terjadi kesalahan sistem.' };
  }
}

// Action to store a class bill
export async function storeClassBillAction(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  const className = session.className;
  if (!className) {
    return { error: 'Anda belum terdaftar di kelas manapun.' };
  }

  const title = formData.get('title') as string;
  const amountStr = formData.get('amount') as string;
  const amount = parseFloat(amountStr);

  if (!title || isNaN(amount) || amount <= 0) {
    return { error: 'Judul/Kategori dan Jumlah Tagihan wajib diisi dengan benar.' };
  }

  try {
    await (prisma as any).classBill.create({
      data: {
        className,
        title,
        amount
      }
    });

    revalidatePath('/teacher/cash');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/parent/dashboard');
    revalidatePath('/parent/cash');
    return { success: true, message: 'Tagihan kelas berhasil ditambahkan.' };
  } catch (error: any) {
    console.error('Store class bill error:', error);
    return { error: 'Gagal menambahkan tagihan. Silakan coba lagi.' };
  }
}

// Action to delete a class bill
export async function deleteClassBillAction(billId: number) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  try {
    const bill = await (prisma as any).classBill.findUnique({
      where: { id: billId }
    });

    if (!bill) {
      return { error: 'Tagihan tidak ditemukan.' };
    }

    if (bill.className !== session.className) {
      return { error: 'Akses ditolak. Tagihan ini bukan milik kelas Anda.' };
    }

    await (prisma as any).classBill.delete({
      where: { id: billId }
    });

    revalidatePath('/teacher/cash');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/parent/dashboard');
    revalidatePath('/parent/cash');
    return { success: true, message: 'Tagihan kelas berhasil dihapus.' };
  } catch (error: any) {
    console.error('Delete class bill error:', error);
    return { error: 'Gagal menghapus tagihan. Silakan coba lagi.' };
  }
}

// 10. Update Student Details
export async function updateStudentAction(
  id: number,
  name: string,
  studentId: string,
  parentName: string
) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return { error: 'Akses ditolak.' };
  }

  if (!name || !studentId || !parentName) {
    return { error: 'Semua kolom wajib diisi.' };
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: { parent: true },
    });

    if (!student) {
      return { error: 'Murid tidak ditemukan.' };
    }

    // Check if new studentId (NISN) is already used by another student
    if (studentId.trim() !== student.studentId) {
      const existingStudent = await prisma.student.findUnique({
        where: { studentId: studentId.trim() },
      });
      if (existingStudent) {
        return { error: 'NISN Murid sudah terdaftar.' };
      }
    }

    // Update parent
    if (student.parentId) {
      // Check if another user has the new username (excluding the current parent)
      if (studentId.trim() !== student.parent?.username) {
        const existingUser = await prisma.user.findUnique({
          where: { username: studentId.trim() },
        });
        if (existingUser && existingUser.id !== student.parentId) {
          return { error: 'Username / NISN ini sudah terdaftar untuk pengguna lain.' };
        }
      }

      await prisma.user.update({
        where: { id: student.parentId },
        data: {
          name: parentName.trim(),
          username: studentId.trim(),
        },
      });
    }

    // Update student
    await prisma.student.update({
      where: { id },
      data: {
        name: name.trim(),
        studentId: studentId.trim(),
      },
    });

    revalidatePath('/teacher/students');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/scan');
    return { success: true, message: 'Data murid berhasil diperbarui.' };
  } catch (error: any) {
    console.error('Update student error:', error);
    return { error: 'Gagal memperbarui data murid. Silakan coba lagi.' };
  }
}




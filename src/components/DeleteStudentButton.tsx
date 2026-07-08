'use client';

import React, { useTransition } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteStudentAction } from '@/app/actions/teacher';

interface DeleteStudentButtonProps {
  studentId: number;
  studentName: string;
}

export default function DeleteStudentButton({ studentId, studentName }: DeleteStudentButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmation = window.confirm(
      `Apakah Anda yakin ingin menghapus data murid "${studentName}"? Semua data absensi, poin, keaktifan, dan karya murid ini akan ikut terhapus secara permanen.`
    );
    
    if (confirmation) {
      startTransition(async () => {
        const res = await deleteStudentAction(studentId);
        if (res?.error) {
          alert(res.error);
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
      title={`Hapus data ${studentName}`}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
      ) : (
        <Trash2 className="w-4 h-4 text-red-500 hover:scale-105 transition-transform" />
      )}
    </button>
  );
}

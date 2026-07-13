'use client';

import React, { useState, useTransition } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteStudentAction } from '@/app/actions/teacher';
import ConfirmModal from './ConfirmModal';

interface DeleteStudentButtonProps {
  studentId: number;
  studentName: string;
}

export default function DeleteStudentButton({ studentId, studentName }: DeleteStudentButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleConfirmDelete = () => {
    setIsConfirmOpen(false);
    startTransition(async () => {
      const res = await deleteStudentAction(studentId);
      if (res?.error) {
        alert(res.error);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsConfirmOpen(true)}
        disabled={isPending}
        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
        title={`Hapus data ${studentName}`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
        ) : (
          <Trash2 className="w-4 h-4 text-red-500 hover:scale-105 transition-transform" />
        )}
      </button>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Murid"
        message={`Apakah Anda yakin ingin menghapus data murid "${studentName}"?\n\nSemua data absensi, poin, keaktifan, dan karya murid ini akan ikut terhapus secara permanen.`}
        confirmText="Hapus Permanen"
        cancelText="Batal"
        type="danger"
        isPending={isPending}
      />
    </>
  );
}

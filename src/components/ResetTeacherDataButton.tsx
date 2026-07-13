'use client';

import React, { useState, useTransition } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { resetTeacherDataAction } from '@/app/actions/admin';
import ConfirmModal from './ConfirmModal';

interface ResetTeacherDataButtonProps {
  id: number;
  name: string;
  className: string;
}

export default function ResetTeacherDataButton({ id, name, className }: ResetTeacherDataButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleConfirmReset = () => {
    setIsConfirmOpen(false);
    startTransition(async () => {
      const result = await resetTeacherDataAction(id);
      if (result?.error) {
        alert(result.error);
      } else if (result?.success) {
        alert(result.message);
      }
    });
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsConfirmOpen(true);
        }}
        disabled={isPending}
        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
        title={`Reset Data Kelas ${className} (${name})`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        ) : (
          <RotateCcw className="w-4 h-4 text-slate-400 hover:text-amber-500 hover:scale-105 transition-all" />
        )}
      </button>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset Data Kelas"
        message={`Apakah Anda yakin ingin mereset SEMUA data kelas "${className}" untuk wali kelas "${name}"?\n\nTindakan ini akan menghapus secara permanen:\n- Semua data murid di kelas tersebut\n- Semua data absensi, aktivitas, & karya murid\n- Semua data kas kelas tersebut\n- Akun orang tua murid yang tidak memiliki anak di kelas lain.\n\nTindakan ini TIDAK dapat dibatalkan.`}
        confirmText="Reset Kelas"
        cancelText="Batal"
        type="warning"
        isPending={isPending}
      />
    </>
  );
}

'use client';

import React, { useState, useTransition } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { destroyTeacherAction } from '@/app/actions/admin';
import ConfirmModal from './ConfirmModal';

interface DeleteTeacherButtonProps {
  id: number;
  name: string;
}

export default function DeleteTeacherButton({ id, name }: DeleteTeacherButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleConfirmDelete = () => {
    setIsConfirmOpen(false);
    startTransition(async () => {
      const result = await destroyTeacherAction(id);
      if (result?.error) {
        alert(result.error);
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
        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
        title={`Hapus Guru ${name}`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Akun Guru"
        message={`Apakah Anda yakin ingin menghapus akun guru "${name}"?\n\nTindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        type="danger"
        isPending={isPending}
      />
    </>
  );
}

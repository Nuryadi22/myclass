'use client';

import React, { useState, useTransition } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { destroyCreativityAction } from '@/app/actions/teacher';
import ConfirmModal from './ConfirmModal';

interface DeleteCreativityButtonProps {
  id: number;
}

export default function DeleteCreativityButton({ id }: DeleteCreativityButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleConfirmDelete = () => {
    setIsConfirmOpen(false);
    startTransition(async () => {
      const result = await destroyCreativityAction(id);
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
        className="absolute top-3 left-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white p-2 rounded-xl backdrop-blur-xs select-none shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center z-10"
        title="Hapus Karya Kreativitas"
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
      </button>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Karya Kreativitas"
        message={`Apakah Anda yakin ingin menghapus karya kreativitas ini?\n\nPoin murid yang bersangkutan juga akan berkurang secara otomatis.`}
        confirmText="Hapus"
        cancelText="Batal"
        type="danger"
        isPending={isPending}
      />
    </>
  );
}

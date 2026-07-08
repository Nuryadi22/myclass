'use client';

import React, { useTransition } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { destroyCreativityAction } from '@/app/actions/teacher';

interface DeleteCreativityButtonProps {
  id: number;
}

export default function DeleteCreativityButton({ id }: DeleteCreativityButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm('Apakah Anda yakin ingin menghapus karya kreativitas ini? Poin murid yang bersangkutan juga akan berkurang.')) {
      startTransition(async () => {
        const result = await destroyCreativityAction(id);
        if (result?.error) {
          alert(result.error);
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
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
  );
}

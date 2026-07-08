'use client';

import React, { useState, useTransition } from 'react';
import { storePunishmentAction } from '@/app/actions/teacher';
import { Loader2, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Student {
  id: number;
  name: string;
}

interface PunishmentFormProps {
  students: Student[];
}

export default function PunishmentForm({ students }: PunishmentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const formEl = e.currentTarget;

    startTransition(async () => {
      const result = await storePunishmentAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Hukuman berhasil dicatat.');
        formEl.reset();
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
      <div>
        <h3 className="font-extrabold text-slate-850 text-base flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span>Pencatatan Pelanggaran (Punishment)</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          Catat pelanggaran disiplin murid. Tindakan ini akan **mengurangi** poin murid.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-2xl flex items-start gap-3 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Gagal menyimpan: </span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-start gap-3 text-xs animate-slide-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Berhasil: </span>
            <span>{success}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Select */}
        <div>
          <label htmlFor="student_id" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Pilih Murid
          </label>
          <select
            id="student_id"
            name="student_id"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
          >
            <option value="">-- Pilih Murid --</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>

        {/* Violation Reason / Title */}
        <div>
          <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Jenis / Deskripsi Pelanggaran
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Contoh: Terlambat masuk kelas"
          />
        </div>

        {/* Points Deducted */}
        <div>
          <label htmlFor="points_deducted" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Jumlah Poin Pengurangan
          </label>
          <input
            id="points_deducted"
            name="points_deducted"
            type="number"
            min={1}
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Masukkan angka pengurangan, misal: 5"
          />
          <span className="text-[10px] text-red-500 font-bold block mt-1">
            *Poin murid akan dikurangi sebesar angka ini (tidak akan kurang dari 0).
          </span>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-red-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <span>Catat Pengurangan Poin</span>
          )}
        </button>
      </form>
    </div>
  );
}

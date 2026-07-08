'use client';

import React, { useState, useTransition } from 'react';
import { storeActivityAction } from '@/app/actions/teacher';
import { Loader2, Plus, Star, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Student {
  id: number;
  name: string;
}

interface ActivityFormProps {
  students: Student[];
}

export default function ActivityForm({ students }: ActivityFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    formData.append('rating', rating.toString());
    const formEl = e.currentTarget;

    startTransition(async () => {
      const result = await storeActivityAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Aktivitas berhasil ditambahkan.');
        setRating(5);
        formEl.reset();
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
      <div>
        <h3 className="font-extrabold text-slate-855 text-base flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-600" />
          <span>Input Aktivitas Keaktifan</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          Catat aktivitas harian murid (hafalan, literasi, numerasi) untuk menambahkan poin.
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
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
          >
            <option value="">-- Pilih Murid --</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Select */}
        <div>
          <label htmlFor="type" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Jenis Keaktifan
          </label>
          <select
            id="type"
            name="type"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
          >
            <option value="memorization">🕌 Hafalan Mandiri / Setoran Ayat</option>
            <option value="literacy">📚 Literasi (Membaca Buku)</option>
            <option value="numeracy">🔢 Numerasi (Matematika & Logika)</option>
          </select>
        </div>

        {/* Title / Description */}
        <div>
          <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Detail Aktivitas / Judul
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Misal: Surah An-Naba Ayat 1-10 / Buku Si Kancil"
          />
        </div>

        {/* Interactive Star Rating Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Rating Penilaian (Poin Dampak)
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 active:scale-95 transition-transform text-2xl cursor-pointer"
                title={`${star} Bintang (${star} Poin)`}
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= rating
                      ? 'fill-amber-400 text-amber-400 filter drop-shadow-sm'
                      : 'text-slate-200 hover:text-amber-200'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-slate-500 font-bold">
              ({rating} Poin keaktifan)
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-slate-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <span>Simpan Aktivitas</span>
          )}
        </button>
      </form>
    </div>
  );
}

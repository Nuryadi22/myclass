'use client';

import React, { useState, useTransition } from 'react';
import { storeTeacherAction } from '@/app/actions/admin';
import { Loader2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TeacherForm() {
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
      const result = await storeTeacherAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Data Guru berhasil disimpan.');
        formEl.reset();
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
      <div>
        <h3 className="font-extrabold text-slate-850 text-lg flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-600" />
          <span>Tambah Guru Kelas Baru</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          Daftarkan akun guru kelas untuk mengelola absensi dan poin keaktifan murid.
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
        <div>
          <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Nama Lengkap Guru
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Contoh: Budi Setiawan, S.Pd"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            No Induk Guru (NIG)
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="NIG sebagai Username & Password awal"
          />
        </div>

        <div>
          <label htmlFor="class_name" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Nama Kelas Binaan
          </label>
          <input
            id="class_name"
            name="class_name"
            type="text"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Contoh: Kelas 4-A"
          />
        </div>

        <div>
          <label htmlFor="app_title" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Judul Aplikasi (by Judul Aplikasi)
          </label>
          <input
            id="app_title"
            name="app_title"
            type="text"
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Contoh: SD IT Al-Iman (Opsional)"
          />
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
            <span>Simpan Data Guru</span>
          )}
        </button>
      </form>
    </div>
  );
}

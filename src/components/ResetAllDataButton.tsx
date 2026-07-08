'use client';

import React, { useState, useTransition } from 'react';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { resetAllDataAction } from '@/app/actions/admin';

export default function ResetAllDataButton() {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.toUpperCase() !== 'RESET') {
      alert("Konfirmasi tidak cocok. Harap ketik 'RESET' untuk melanjutkan.");
      return;
    }

    startTransition(async () => {
      const result = await resetAllDataAction();
      if (result?.error) {
        alert(result.error);
      } else if (result?.success) {
        alert(result.message);
        setShowConfirm(false);
        setConfirmText('');
      }
    });
  };

  return (
    <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6 space-y-4 shadow-2xs">
      <div className="flex gap-3.5 items-start">
        <div className="w-10 h-10 rounded-2xl bg-red-100/70 text-red-650 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-red-900 text-sm">Zona Bahaya: Reset Seluruh Data Sistem</h4>
          <p className="text-slate-500 text-[11px] font-semibold leading-relaxed max-w-xl">
            Tindakan ini akan menghapus secara permanen semua data murid, semua data absensi, log keaktifan murid, 
            seluruh foto biometrik wajah, karya kreativitas portofolio, catatan transaksi kas kelas, serta seluruh 
            akun wali murid yang terdaftar. Akun guru dan admin tidak akan dihapus.
          </p>
        </div>
      </div>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 font-extrabold text-white rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-red-100 transition-all hover:scale-103 active:scale-98"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Reset Semua Data Aplikasi</span>
        </button>
      ) : (
        <form onSubmit={handleReset} className="space-y-3 max-w-sm animate-fade-in">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-red-700">
              Ketik 'RESET' untuk mengonfirmasi:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESET"
                required
                className="block w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-slate-800 placeholder-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-xs font-semibold uppercase tracking-wider"
              />
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-extrabold rounded-lg text-xs flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-sm"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Konfirmasi</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

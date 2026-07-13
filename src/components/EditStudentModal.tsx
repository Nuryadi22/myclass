'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { X, Edit2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { updateStudentAction } from '@/app/actions/teacher';

interface StudentType {
  id: number;
  name: string;
  studentId: string;
  parent?: {
    name: string;
    username: string;
  } | null;
}

interface EditStudentModalProps {
  student: StudentType;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditStudentModal({ student, isOpen, onClose }: EditStudentModalProps) {
  const [name, setName] = useState(student.name);
  const [studentId, setStudentId] = useState(student.studentId);
  const [parentName, setParentName] = useState(student.parent?.name || '');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset fields when student changes
  useEffect(() => {
    setName(student.name);
    setStudentId(student.studentId);
    setParentName(student.parent?.name || '');
    setError(null);
    setSuccess(null);
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !studentId.trim() || !parentName.trim()) {
      setError('Semua kolom wajib diisi.');
      return;
    }

    startTransition(async () => {
      const result = await updateStudentAction(student.id, name, studentId, parentName);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Data murid berhasil diperbarui.');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={isPending ? undefined : onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
      ></div>

      {/* Modal Box */}
      <div className="relative bg-white rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl border border-slate-100 z-50 space-y-6 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-850 text-base">Edit Data Murid</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Ubah informasi data murid & akun wali murid</p>
            </div>
          </div>
          {!isPending && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-2xl flex items-start gap-3 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-red-650 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Gagal memperbarui: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-start gap-3 text-xs animate-slide-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Berhasil: </span>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit_name" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Nama Lengkap Murid
            </label>
            <input
              id="edit_name"
              type="text"
              required
              disabled={isPending}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all disabled:opacity-50"
              placeholder="Contoh: Ahmad Fauzi"
            />
          </div>

          <div>
            <label htmlFor="edit_student_id" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Nomor Induk Siswa Nasional (NISN)
            </label>
            <input
              id="edit_student_id"
              type="text"
              required
              disabled={isPending}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all disabled:opacity-50"
              placeholder="NISN sebagai Username & Password Ortu"
            />
          </div>

          <div>
            <label htmlFor="edit_parent_name" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Nama Lengkap Wali / Orang Tua
            </label>
            <input
              id="edit_parent_name"
              type="text"
              required
              disabled={isPending}
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all disabled:opacity-50"
              placeholder="Contoh: Hendra Wijaya"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-slate-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

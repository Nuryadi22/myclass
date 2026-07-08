'use client';

import React, { useState, useTransition } from 'react';
import { storeCreativityAction } from '@/app/actions/teacher';
import { Loader2, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Student {
  id: number;
  name: string;
}

interface CreativityFormProps {
  students: Student[];
}

export default function CreativityForm({ students }: CreativityFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleStudentCheck = (studentId: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (selectedStudentIds.length === 0) {
      setError('Anda harus memilih setidaknya satu murid.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    // Remove default checkbox values and append selected student IDs manually
    selectedStudentIds.forEach((id) => {
      formData.append('student_ids', id.toString());
    });

    const formEl = e.currentTarget;

    startTransition(async () => {
      const result = await storeCreativityAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Karya kreativitas berhasil diunggah.');
        setSelectedStudentIds([]);
        formEl.reset();
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
      <div>
        <h3 className="font-extrabold text-slate-855 text-base flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-600" />
          <span>Unggah Karya Kreativitas</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          Unggah foto hasil karya (pribadi/kelompok) dan berikan poin penghargaan.
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

      <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
        {/* Student Checkboxes for Multi-Select */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Pilih Anggota Murid (Bisa Pilih Banyak)
          </label>
          <div className="max-h-36 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            {students.map((student) => (
              <label key={student.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedStudentIds.includes(student.id)}
                  onChange={() => handleStudentCheck(student.id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded-lg cursor-pointer"
                />
                <span>{student.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Nama Karya / Judul
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Misal: Maket Rumah Kardus / Origami Burung"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label htmlFor="image" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Foto Hasil Karya (Maks 2MB)
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            required
            className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 text-xs font-semibold cursor-pointer"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Deskripsi Karya (Opsional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Tuliskan keterangan singkat tentang karya ini..."
          />
        </div>

        {/* Points Awarded */}
        <div>
          <label htmlFor="points_awarded" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Poin Penghargaan (Points Awarded)
          </label>
          <input
            id="points_awarded"
            name="points_awarded"
            type="number"
            min={1}
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Misal: 10"
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
              <span>Mengunggah...</span>
            </>
          ) : (
            <span>Unggah Karya</span>
          )}
        </button>
      </form>
    </div>
  );
}

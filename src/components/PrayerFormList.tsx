'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { storePrayerAction } from '@/app/actions/parent';
import { Loader2, ClipboardCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Prayer {
  id: number;
  subuh: boolean;
  dzuhur: boolean;
  ashar: boolean;
  maghrib: boolean;
  isya: boolean;
  notes: string | null;
}

interface Student {
  id: number;
  name: string;
  className: string;
  studentId: string;
}

interface ChildPrayer {
  student: Student;
  today_prayer: Prayer | null;
}

interface PrayerFormListProps {
  prayersData: ChildPrayer[];
  todayStr: string;
}

export default function PrayerFormList({ prayersData, todayStr }: PrayerFormListProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Local state to manage checkbox edits reactively
  const [formDataState, setFormDataState] = useState(
    prayersData.map((data) => ({
      studentId: data.student.id,
      subuh: data.today_prayer?.subuh || false,
      dzuhur: data.today_prayer?.dzuhur || false,
      ashar: data.today_prayer?.ashar || false,
      maghrib: data.today_prayer?.maghrib || false,
      isya: data.today_prayer?.isya || false,
      notes: data.today_prayer?.notes || '',
    }))
  );

  // Reset local state when prayersData or todayStr changes (e.g. from date picker)
  useEffect(() => {
    setFormDataState(
      prayersData.map((data) => ({
        studentId: data.student.id,
        subuh: data.today_prayer?.subuh || false,
        dzuhur: data.today_prayer?.dzuhur || false,
        ashar: data.today_prayer?.ashar || false,
        maghrib: data.today_prayer?.maghrib || false,
        isya: data.today_prayer?.isya || false,
        notes: data.today_prayer?.notes || '',
      }))
    );
  }, [prayersData, todayStr]);

  const handleCheckboxChange = (studentId: number, field: string) => {
    setFormDataState((prev) =>
      prev.map((item) =>
        item.studentId === studentId
          ? { ...item, [field]: !item[field as keyof typeof item] }
          : item
      )
    );
  };

  const handleNotesChange = (studentId: number, val: string) => {
    setFormDataState((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, notes: val } : item))
    );
  };

  const handleSubmit = (studentId: number, index: number) => {
    setError(null);
    setSuccess(null);

    const state = formDataState[index];
    const formData = new FormData();
    formData.append('student_id', studentId.toString());
    formData.append('date', todayStr);
    formData.append('notes', state.notes);

    if (state.subuh) formData.append('subuh', 'on');
    if (state.dzuhur) formData.append('dzuhur', 'on');
    if (state.ashar) formData.append('ashar', 'on');
    if (state.maghrib) formData.append('maghrib', 'on');
    if (state.isya) formData.append('isya', 'on');

    startTransition(async () => {
      const result = await storePrayerAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Laporan shalat berhasil disimpan.');
      }
    });
  };

  const dateLabel = new Date(todayStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Date Picker Selector */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-slide-in">
        <div>
          <h3 className="font-extrabold text-slate-850 text-base">Pilih Tanggal Laporan</h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Pilih tanggal untuk mencatat atau melihat riwayat shalat anak.
          </p>
        </div>
        <div className="flex-shrink-0">
          <input
            type="date"
            value={todayStr}
            onChange={(e) => {
              const selectedDate = e.target.value;
              if (selectedDate) {
                router.push(`/parent/prayer?date=${selectedDate}`);
              }
            }}
            max={new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date())}
            className="block w-full sm:w-48 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-2xl flex items-start gap-3 text-xs animate-shake">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Gagal menyimpan: </span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-start gap-3 text-xs animate-slide-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Berhasil: </span>
            <span>{success}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {prayersData.map((data, idx) => {
          const student = data.student;
          const state = formDataState[idx];
          const totalChecked = [state.subuh, state.dzuhur, state.ashar, state.maghrib, state.isya].filter(Boolean).length;

          return (
            <div
              key={student.id}
              className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs animate-slide-in"
            >
              {/* Profile Bar */}
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-extrabold text-sm shadow-3xs">
                    {student.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-850 text-sm">{student.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Kelas: {student.className} | NISN: {student.studentId}
                    </p>
                  </div>
                </div>
                <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-[10px] font-bold">
                  {totalChecked} / 5 Waktu Terlapor
                </div>
              </div>

              {/* Checklist Grid */}
              <div className="space-y-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-450">
                  Ceklis Pelaksanaan Shalat (Tanggal: {dateLabel})
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'].map((prName) => {
                    const checked = state[prName as keyof typeof state] as boolean;
                    return (
                      <button
                        key={prName}
                        type="button"
                        onClick={() => handleCheckboxChange(student.id, prName)}
                        className={`py-3 px-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:scale-103 ${
                          checked
                            ? 'bg-emerald-50 border-emerald-250 text-emerald-800 shadow-3xs'
                            : 'bg-slate-50/50 border-slate-200 text-slate-450'
                        }`}
                      >
                        <span className="text-sm">{prName === 'subuh' ? '🌅' : prName === 'dzuhur' ? '☀️' : prName === 'ashar' ? '🌤️' : prName === 'maghrib' ? '🌆' : '🌙'}</span>
                        <span className="capitalize">{prName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor={`notes-${student.id}`} className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                  Catatan Ibadah Tambahan (Opsional)
                </label>
                <textarea
                  id={`notes-${student.id}`}
                  rows={2}
                  value={state.notes}
                  onChange={(e) => handleNotesChange(student.id, e.target.value)}
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white text-xs font-semibold transition-all"
                  placeholder="Misal: Shalat Dhuha, tadarus Al-Quran, dll..."
                />
              </div>

              <button
                type="button"
                onClick={() => handleSubmit(student.id, idx)}
                disabled={isPending}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Laporan...</span>
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Simpan Laporan Ibadah Anak</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

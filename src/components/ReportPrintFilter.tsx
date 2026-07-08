'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';

interface ReportPrintFilterProps {
  studentId: number;
}

export default function ReportPrintFilter({ studentId }: ReportPrintFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentMonth = searchParams.get('month') || '';
  const currentYear = searchParams.get('school_year') || '2025/2026';
  const currentPlace = searchParams.get('place') || 'Jakarta';

  const months = [
    { value: '', label: 'Semua Bulan' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = e.target.value;
    const params = new URLSearchParams(window.location.search);
    if (month) {
      params.set('month', month);
    } else {
      params.delete('month');
    }
    router.push(`/teacher/reports/${studentId}?${params.toString()}`);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const year = e.target.value;
    const params = new URLSearchParams(window.location.search);
    if (year) {
      params.set('school_year', year);
    } else {
      params.delete('school_year');
    }
    router.push(`/teacher/reports/${studentId}?${params.toString()}`);
  };

  const handlePlaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const place = e.target.value;
    const params = new URLSearchParams(window.location.search);
    if (place) {
      params.set('place', place);
    } else {
      params.delete('place');
    }
    router.push(`/teacher/reports/${studentId}?${params.toString()}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="no-print bg-white rounded-3xl border border-slate-100 p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tahun Pelajaran
          </label>
          <input
            type="text"
            value={currentYear}
            onChange={handleYearChange}
            placeholder="Contoh: 2025/2026"
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 text-xs font-semibold"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Filter Bulan
          </label>
          <select
            value={currentMonth}
            onChange={handleMonthChange}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 text-xs font-semibold cursor-pointer"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tempat Cetak
          </label>
          <input
            type="text"
            value={currentPlace}
            onChange={handlePlaceChange}
            placeholder="Contoh: Jakarta"
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 text-xs font-semibold"
          />
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="w-full md:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-slate-100 hover:shadow-lg transition-all"
      >
        <Printer className="w-4 h-4" />
        Cetak Laporan (PDF)
      </button>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { storeCashTransactionAction, deleteCashTransactionAction } from '@/app/actions/teacher';
import Chart from 'chart.js/auto';
import { Loader2, Plus, Minus, Trash2, Printer, Calendar, Banknote, Receipt, Wallet, AlertCircle } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  studentId: string;
}

interface Transaction {
  id: number;
  className: string;
  type: string; // 'income' or 'expense'
  studentId: number | null;
  studentName: string | null;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
}

interface ClassCashManagerProps {
  className: string;
  students: Student[];
  initialTransactions: Transaction[];
}

export default function ClassCashManager({
  className,
  students,
  initialTransactions,
}: ClassCashManagerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [tab, setTab] = useState<'income' | 'expense'>('income');
  const [filterType, setFilterType] = useState<'all' | 'week' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Set default selected month to current month on mount
  useEffect(() => {
    const today = new Date();
    setSelectedMonth(today.toISOString().substring(0, 7));
  }, []);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());

  // Get all unique YYYY-MM months from transactions, sorted descending
  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    
    // Always include current month
    const today = new Date();
    const currentMonthStr = today.toISOString().substring(0, 7);
    monthsSet.add(currentMonthStr);
    
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        monthsSet.add(t.date.substring(0, 7));
      }
    });
    
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  };

  const formatMonthYear = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  };

  // Calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Filtered transactions for list
  const getFilteredTransactions = () => {
    const today = new Date();
    
    if (filterType === 'month') {
      const monthStr = selectedMonth || today.toISOString().substring(0, 7);
      return transactions.filter((t) => t.date.startsWith(monthStr));
    }
    
    if (filterType === 'week') {
      // Get Monday and Sunday of this week in local time
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      const monStr = monday.toISOString().substring(0, 10);
      const sunStr = sunday.toISOString().substring(0, 10);
      
      return transactions.filter((t) => t.date >= monStr && t.date <= sunStr);
    }
    
    return transactions;
  };

  const filteredTransactions = getFilteredTransactions();

  // Filtered calculations for Pie Chart & Filtered summary
  const filteredIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Chart rendering
  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const hasData = filteredIncome > 0 || filteredExpense > 0;

    chartInstance.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: hasData ? ['Pemasukan', 'Pengeluaran'] : ['Belum Ada Transaksi'],
        datasets: [
          {
            data: hasData ? [filteredIncome, filteredExpense] : [1],
            backgroundColor: hasData
              ? ['rgb(16, 185, 129)', 'rgb(239, 68, 68)'] // Emerald vs Red
              : ['rgb(226, 232, 240)'], // Slate-200
            borderWidth: 1.5,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { weight: 'bold', size: 11 },
              padding: 15,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                if (!hasData) return ' Tidak ada transaksi';
                const val = context.raw as number;
                return ` Rp ${val.toLocaleString('id-ID')}`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [filteredIncome, filteredExpense]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    formData.append('type', tab);

    const formEl = e.currentTarget;

    startTransition(async () => {
      const result = await storeCashTransactionAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Transaksi kas berhasil disimpan.');
        formEl.reset();
        
        // Refresh local state by pulling all transactions
        // Instead of reloading page, let's update list locally
        // Next.js server actions revalidatePath updates the page,
        // but for smooth SPA-like experience we can trigger a soft refresh
        // or just let revalidatePath handle server rendering.
        // We reload using window.location.reload() for ease, or rely on router.refresh.
        // Let's reload to fetch refreshed data cleanly.
        window.location.reload();
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi kas ini?')) return;

    startTransition(async () => {
      const result = await deleteCashTransactionAction(id);
      if (result?.success) {
        window.location.reload();
      } else {
        alert(result?.error || 'Gagal menghapus transaksi.');
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* LEFT & CENTER PANEL (Forms + Report List) */}
      <div className="lg:col-span-2 space-y-8 print:hidden">
        
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Balance card */}
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between shadow-3xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Saldo Kas Kelas</span>
              <h3 className="text-xl font-extrabold text-emerald-850">
                Rp {balance.toLocaleString('id-ID')}
              </h3>
              <span className="text-[9px] text-emerald-500 font-bold block">Sisa dana tersedia</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* Income card */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center justify-between shadow-3xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pemasukan</span>
              <h3 className="text-xl font-extrabold text-emerald-600">
                Rp {totalIncome.toLocaleString('id-ID')}
              </h3>
              <span className="text-[9px] text-slate-400 font-semibold block">Dari iuran murid dll</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-emerald-650 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
          </div>

          {/* Expense card */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center justify-between shadow-3xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pengeluaran</span>
              <h3 className="text-xl font-extrabold text-red-500">
                Rp {totalExpense.toLocaleString('id-ID')}
              </h3>
              <span className="text-[9px] text-slate-400 font-semibold block">Untuk kebutuhan kelas</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-red-500 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* INPUT TRANSACTION FORM */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-3xs">
          {/* Tab Selection */}
          <div className="flex border-b border-slate-100 pb-4 justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-855 text-slate-850 text-base">Catat Transaksi Baru</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Input uang kas masuk dari murid atau pengeluaran operasional.</p>
            </div>
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => { setTab('income'); setError(null); setSuccess(null); }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  tab === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pemasukan</span>
              </button>
              <button
                type="button"
                onClick={() => { setTab('expense'); setError(null); setSuccess(null); }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  tab === 'expense' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Pengeluaran</span>
              </button>
            </div>
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
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-start gap-3 text-xs">
              <span className="font-bold">Berhasil: </span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* If Income: Select student dropdown */}
              {tab === 'income' ? (
                <div>
                  <label htmlFor="student_id" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nama Murid Pembayar
                  </label>
                  <select
                    id="student_id"
                    name="student_id"
                    required
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    <option value="">-- Pilih Murid --</option>
                    {students.map((std) => (
                      <option key={std.id} value={std.id}>
                        {std.name} ({std.studentId})
                      </option>
                    ))}
                    <option value="other">Lainnya (Bukan Murid)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Jenis Pengeluaran
                  </label>
                  <input
                    id="description"
                    name="description"
                    type="text"
                    required
                    placeholder="Contoh: Beli Spidol, Sapu Kelas, dll"
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
                  />
                </div>
              )}

              <div>
                <label htmlFor="amount" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Nominal Transaksi (Rp)
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 10000"
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Tanggal Transaksi
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  required
                  defaultValue={todayStr}
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
                />
              </div>

              {/* If Income: Add description/notes field */}
              {tab === 'income' && (
                <div>
                  <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Keterangan Tambahan
                  </label>
                  <input
                    id="description"
                    name="description"
                    type="text"
                    required
                    placeholder="Contoh: Iuran Kas Minggu 1, Uang Denda, dll"
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-50'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-50'
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Transaksi...</span>
                </>
              ) : (
                <span>Simpan Transaksi {tab === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* RIGHT PANEL (Pie Chart) */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-3xs print:hidden">
        <div>
          <h3 className="font-extrabold text-slate-850 text-base">Rasio Keuangan Kelas</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Persentase perbandingan kas masuk dan keluar kelas.</p>
        </div>
        <div className="relative h-60 w-full flex items-center justify-center">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>

      {/* BOTTOM REPORT LOGS & TABLE (Contains print ID) */}
      <div id="print-area" className="col-span-1 lg:col-span-3 bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-850 text-lg">Laporan Pembukuan Kas Kelas ({className})</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Rincian seluruh pencatatan transaksi masuk dan keluar kas kelas.
            </p>
          </div>
          
          <div className="flex items-center gap-3 print:hidden">
            {/* Period Filters */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => { setFilterType('all'); }}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterType === 'all' ? 'bg-white text-slate-850 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => { setFilterType('week'); }}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterType === 'week' ? 'bg-white text-slate-855 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Minggu Ini
              </button>
              <select
                value={filterType === 'month' ? selectedMonth : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setFilterType('month');
                    setSelectedMonth(e.target.value);
                  }
                }}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer border-0 text-[10px] font-bold focus:outline-none ${
                  filterType === 'month' ? 'bg-white text-slate-850 shadow-xs' : 'bg-transparent text-slate-500 hover:text-slate-850'
                }`}
              >
                <option value="" disabled>Pilih Bulan</option>
                {getAvailableMonths().map((m) => (
                  <option key={m} value={m}>
                    {formatMonthYear(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Print trigger */}
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[10px] flex items-center gap-1 shadow-sm shadow-indigo-100 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* Print Header (Only visible on print) */}
        <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-4">
          <h1 className="text-2xl font-black text-center text-slate-900 tracking-tight uppercase">Laporan Keuangan Kas Kelas</h1>
          <h2 className="text-lg font-bold text-center text-slate-700">Kelas: {className}</h2>
          <p className="text-xs text-center text-slate-500 font-bold mt-1">
            Periode: {filterType === 'month' ? formatMonthYear(selectedMonth) : filterType === 'week' ? 'Minggu Ini' : 'Semua Transaksi'}
          </p>
          <p className="text-xs text-center text-slate-400 font-semibold mt-0.5">Dicetak pada tanggal: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          
          <div className="grid grid-cols-3 gap-4 mt-6 text-center text-xs">
            <div className="border border-slate-200 p-2.5 rounded-xl">
              <span className="font-bold block text-[9px] uppercase text-slate-400">Total Pemasukan:</span>
              <span className="font-extrabold text-sm text-emerald-600">Rp {totalIncome.toLocaleString('id-ID')}</span>
            </div>
            <div className="border border-slate-200 p-2.5 rounded-xl">
              <span className="font-bold block text-[9px] uppercase text-slate-400">Total Pengeluaran:</span>
              <span className="font-extrabold text-sm text-red-500">Rp {totalExpense.toLocaleString('id-ID')}</span>
            </div>
            <div className="border border-slate-200 p-2.5 rounded-xl">
              <span className="font-bold block text-[9px] uppercase text-slate-400">Sisa Saldo Kas:</span>
              <span className="font-extrabold text-sm text-indigo-700">Rp {balance.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-3">No</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Jenis</th>
                <th className="py-3 px-3">Detail Keterangan</th>
                <th className="py-3 px-3 text-right">Nominal</th>
                <th className="py-3 px-3 text-center print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    Tidak ada catatan transaksi dalam periode ini.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => {
                  const formattedTxDate = new Intl.DateTimeFormat('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(tx.date));

                  return (
                    <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/10 transition-colors">
                      <td className="py-3 px-3 text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="py-3 px-3">{formattedTxDate}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                            tx.type === 'income'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-red-50 border-red-200 text-red-700'
                          }`}
                        >
                          {tx.type === 'income' ? 'Masuk' : 'Keluar'}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-sm truncate">
                        {tx.type === 'income' ? (
                          tx.studentName ? (
                            <span>
                              Iuran dari <span className="font-bold text-slate-900">{tx.studentName}</span>
                              <span className="text-slate-400 text-[10px] ml-1 font-semibold">({tx.description})</span>
                            </span>
                          ) : (
                            <span>
                              Pemasukan <span className="font-bold text-slate-900">Lainnya</span>
                              <span className="text-slate-400 text-[10px] ml-1 font-semibold">({tx.description})</span>
                            </span>
                          )
                        ) : (
                          <span>{tx.description}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        Rp {tx.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-center print:hidden">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Totals in footer */}
            {filteredTransactions.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/70 font-extrabold border-t border-slate-200">
                  <td colSpan={4} className="py-3.5 px-3 text-right text-slate-500 uppercase tracking-wide">Total Pemasukan Terfilter:</td>
                  <td className="py-3.5 px-3 text-right text-emerald-600 font-mono">
                    Rp {filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="print:hidden"></td>
                </tr>
                <tr className="bg-slate-50/70 font-extrabold">
                  <td colSpan={4} className="py-3.5 px-3 text-right text-slate-500 uppercase tracking-wide">Total Pengeluaran Terfilter:</td>
                  <td className="py-3.5 px-3 text-right text-red-500 font-mono">
                    Rp {filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="print:hidden"></td>
                </tr>
                <tr className="bg-indigo-50/50 font-black border-t-2 border-slate-200">
                  <td colSpan={4} className="py-4 px-3 text-right text-indigo-900 uppercase tracking-wide">Saldo Terfilter:</td>
                  <td className="py-4 px-3 text-right text-indigo-900 font-mono text-sm">
                    Rp {(
                      filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) -
                      filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
                    ).toLocaleString('id-ID')}
                  </td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

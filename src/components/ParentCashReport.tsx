'use client';

import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Printer, Calendar, Banknote, Receipt, Wallet } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  className: string;
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

interface ParentCashReportProps {
  students: Student[];
  initialTransactions: Transaction[];
}

export default function ParentCashReport({
  students,
  initialTransactions,
}: ParentCashReportProps) {
  // Select active student/class
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students.length > 0 ? students[0].id.toString() : ''
  );
  
  const [filterType, setFilterType] = useState<'all' | 'week' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Set default selected month to current month on mount or class switch
  useEffect(() => {
    const today = new Date();
    setSelectedMonth(today.toISOString().substring(0, 7));
  }, [selectedStudentId]);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Active student object
  const activeStudent = students.find((s) => s.id.toString() === selectedStudentId);
  const activeClassName = activeStudent ? activeStudent.className : '';

  // Get transactions for active student's class
  const classTransactions = initialTransactions.filter(
    (t) => t.className === activeClassName
  );

  // Get all unique YYYY-MM months from transactions, sorted descending
  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    
    // Always include current month
    const today = new Date();
    const currentMonthStr = today.toISOString().substring(0, 7);
    monthsSet.add(currentMonthStr);
    
    classTransactions.forEach((t) => {
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

  // Financial calculations for active class
  const totalIncome = classTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // Financial calculations for active class
  const totalExpense = classTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Filtered transactions for the report table
  const getFilteredTransactions = () => {
    const today = new Date();
    
    if (filterType === 'month') {
      const monthStr = selectedMonth || today.toISOString().substring(0, 7);
      return classTransactions.filter((t) => t.date.startsWith(monthStr));
    }
    
    if (filterType === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      const monStr = monday.toISOString().substring(0, 10);
      const sunStr = sunday.toISOString().substring(0, 10);
      
      return classTransactions.filter((t) => t.date >= monStr && t.date <= sunStr);
    }
    
    return classTransactions;
  };

  const filteredTransactions = getFilteredTransactions();

  // Filtered calculations for Pie Chart & Filtered summary
  const filteredIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Simple deterministic string hashing for IDs
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  // Consolidate student income transactions per day (perhari) for parents' view
  const getConsolidatedTransactions = () => {
    const studentIncomes = filteredTransactions.filter(
      (t) => t.type === 'income' && t.studentId !== null
    );

    // Group student incomes by date
    const studentIncomesByDate: Record<string, number> = {};
    studentIncomes.forEach((t) => {
      studentIncomesByDate[t.date] = (studentIncomesByDate[t.date] || 0) + t.amount;
    });

    // Create consolidated student income rows per date
    const consolidatedStudentIncomes = Object.entries(studentIncomesByDate).map(([date, amount]) => {
      const consolidatedRow: Transaction = {
        id: -(Math.abs(hashCode(date)) % 1000000) - 1000,
        className: activeClassName,
        type: 'income',
        studentId: null,
        studentName: 'Murid',
        description: 'Kalkulasi Murid',
        amount: amount,
        date: date,
      };
      return consolidatedRow;
    });

    const nonStudentTransactions = filteredTransactions.filter(
      (t) => !(t.type === 'income' && t.studentId !== null)
    );

    const combined = [...consolidatedStudentIncomes, ...nonStudentTransactions];
    
    // Sort combined transactions by date descending, then secondary by ID descending
    combined.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.id - a.id;
    });

    return combined;
  };

  const displayTransactions = getConsolidatedTransactions();

  // Chart rendering for comparison
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
              : ['rgb(226, 232, 240)'],
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
  }, [filteredIncome, filteredExpense, selectedStudentId]);

  const handlePrint = () => {
    window.print();
  };

  if (students.length === 0) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-xs text-center text-slate-400 font-bold">
        Akun Anda belum ditautkan dengan data murid manapun.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Selector and Options Panel */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs no-print">
        <div>
          <h3 className="font-extrabold text-slate-850 text-base">Pilih Data Kas Kelas Anak</h3>
          <p className="text-xs text-slate-450 font-semibold mt-0.5">
            Pilih anak untuk melihat rincian laporan kas kelas mereka.
          </p>
        </div>

        {/* Dropdown for selecting child */}
        {students.length > 1 ? (
          <div className="flex-shrink-0">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="block w-full md:w-64 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
            >
              {students.map((std) => (
                <option key={std.id} value={std.id}>
                  {std.name} ({std.className})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-xs bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-2 rounded-xl font-bold">
            Anak: {activeStudent?.name} ({activeClassName})
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT PANEL: Financial Cards */}
        <div className="lg:col-span-2 space-y-6 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Balance Card */}
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl flex items-center justify-between shadow-2xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Saldo Kas Kelas</span>
                <h3 className="text-lg font-extrabold text-emerald-850">
                  Rp {balance.toLocaleString('id-ID')}
                </h3>
                <span className="text-[9px] text-emerald-500 font-bold block">Sisa dana tersedia</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            {/* Income Card */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl flex items-center justify-between shadow-2xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pemasukan</span>
                <h3 className="text-lg font-extrabold text-emerald-600">
                  Rp {totalIncome.toLocaleString('id-ID')}
                </h3>
                <span className="text-[9px] text-slate-400 font-semibold block">Dari iuran murid dll</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-emerald-650 flex items-center justify-center">
                <Banknote className="w-5 h-5" />
              </div>
            </div>

            {/* Expense Card */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl flex items-center justify-between shadow-2xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pengeluaran</span>
                <h3 className="text-lg font-extrabold text-red-500">
                  Rp {totalExpense.toLocaleString('id-ID')}
                </h3>
                <span className="text-[9px] text-slate-400 font-semibold block">Kebutuhan operasional</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-red-500 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Pie Chart */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs no-print">
          <div>
            <h3 className="font-extrabold text-slate-850 text-sm">Persentase Keuangan</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Perbandingan rasio kas masuk dan keluar.</p>
          </div>
          <div className="relative h-48 w-full flex items-center justify-center">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>
      </div>

      {/* REPORT LEDGER TABLE & DETAILS */}
      <div id="print-area-parent" className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-850 text-base">Laporan Pembukuan Kas ({activeClassName})</h3>
          </div>
          
          <div className="flex items-center gap-3 no-print">
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
                  filterType === 'week' ? 'bg-white text-slate-850 shadow-xs' : 'text-slate-500 hover:text-slate-800'
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
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] flex items-center gap-1 shadow-sm shadow-emerald-50 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* Print Header (Only visible on print) */}
        <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-4">
          <h1 className="text-2xl font-black text-center text-slate-900 tracking-tight uppercase">Laporan Keuangan Kas Kelas</h1>
          <h2 className="text-lg font-bold text-center text-slate-700">Kelas: {activeClassName}</h2>
          <p className="text-xs text-center text-slate-500 font-bold mt-1">
            Periode: {filterType === 'month' ? formatMonthYear(selectedMonth) : filterType === 'week' ? 'Minggu Ini' : 'Semua Transaksi'}
          </p>
          <p className="text-xs text-center text-slate-400 font-semibold mt-0.5">Dicetak oleh Wali dari: {activeStudent?.name}</p>
          <p className="text-xs text-center text-slate-400 font-semibold">Tanggal cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          
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
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-700">
              {displayTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                    Tidak ada catatan transaksi dalam periode ini.
                  </td>
                </tr>
              ) : (
                displayTransactions.map((tx, idx) => {
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
                          tx.id < 0 ? (
                            <span>
                              Kalkulasi <span className="font-bold text-slate-900">{tx.studentName}</span>
                            </span>
                          ) : tx.studentName ? (
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
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Totals in footer */}
            {displayTransactions.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/70 font-extrabold border-t border-slate-200">
                  <td colSpan={4} className="py-3.5 px-3 text-right text-slate-500 uppercase tracking-wide">Total Pemasukan Terfilter:</td>
                  <td className="py-3.5 px-3 text-right text-emerald-600 font-mono">
                    Rp {filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toLocaleString('id-ID')}
                  </td>
                </tr>
                <tr className="bg-slate-50/70 font-extrabold">
                  <td colSpan={4} className="py-3.5 px-3 text-right text-slate-500 uppercase tracking-wide">Total Pengeluaran Terfilter:</td>
                  <td className="py-3.5 px-3 text-right text-red-500 font-mono">
                    Rp {filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toLocaleString('id-ID')}
                  </td>
                </tr>
                <tr className="bg-emerald-50/50 font-black border-t-2 border-slate-200">
                  <td colSpan={4} className="py-4 px-3 text-right text-emerald-900 uppercase tracking-wide">Saldo Terfilter:</td>
                  <td className="py-4 px-3 text-right text-emerald-900 font-mono text-sm">
                    Rp {(
                      filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) -
                      filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
                    ).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

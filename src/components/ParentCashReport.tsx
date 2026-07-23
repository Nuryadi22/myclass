'use client';

import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Printer, Banknote, Receipt, Wallet, CheckCircle, AlertCircle, ImageIcon, X } from 'lucide-react';

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
  photoPath?: string | null;
}

interface ClassBill {
  id: number;
  className: string;
  title: string;
  amount: number;
}

interface ParentCashReportProps {
  students: Student[];
  bills: ClassBill[];
  initialTransactions: Transaction[];
}

export default function ParentCashReport({
  students,
  bills,
  initialTransactions,
}: ParentCashReportProps) {
  // Select active student/class
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students.length > 0 ? students[0].id.toString() : ''
  );
  
  const [printFilterType, setPrintFilterType] = useState<'all' | 'income' | 'expense' | 'date_range' | 'month'>('all');
  const [printStartDate, setPrintStartDate] = useState<string>('');
  const [printEndDate, setPrintEndDate] = useState<string>('');
  const [printMonth, setPrintMonth] = useState<string>('');
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  // Set default selected month to current month on student switch
  useEffect(() => {
    const today = new Date();
    setPrintMonth(today.toISOString().substring(0, 7));
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
    const today = new Date();
    monthsSet.add(today.toISOString().substring(0, 7));
    
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
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  // Financial calculations for active class
  const totalIncome = classTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = classTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Filtered transactions for the report table
  const getFilteredTransactions = () => {
    if (printFilterType === 'income') {
      return classTransactions.filter((t) => t.type === 'income');
    }
    
    if (printFilterType === 'expense') {
      return classTransactions.filter((t) => t.type === 'expense');
    }

    if (printFilterType === 'month') {
      const monthStr = printMonth || new Date().toISOString().substring(0, 7);
      return classTransactions.filter((t) => t.date.startsWith(monthStr));
    }
    
    if (printFilterType === 'date_range') {
      let filtered = classTransactions;
      if (printStartDate) {
        filtered = filtered.filter((t) => t.date >= printStartDate);
      }
      if (printEndDate) {
        filtered = filtered.filter((t) => t.date <= printEndDate);
      }
      return filtered;
    }
    
    return classTransactions;
  };

  const filteredTransactions = getFilteredTransactions();

  const filteredIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Consolidation grouping function for display table
  const getGroupedTransactions = (txList: typeof filteredTransactions) => {
    const grouped: any[] = [];
    const incomeGroups: Record<string, any> = {};

    txList.forEach((tx) => {
      if (tx.type === 'expense' || !tx.studentId) {
        // Keep standalone
        grouped.push({
          ...tx,
          ids: [tx.id],
          isMerged: false,
          studentPayments: []
        });
      } else {
        // Group student income by date + description
        const key = `${tx.date}_${tx.description.trim().toLowerCase()}`;
        if (incomeGroups[key]) {
          const group = incomeGroups[key];
          group.ids.push(tx.id);
          group.amount += tx.amount;
          group.studentPayments.push({
            id: tx.id,
            name: tx.studentName,
            amount: tx.amount,
          });
        } else {
          const newGroup = {
            id: tx.id,
            ids: [tx.id],
            date: tx.date,
            type: 'income',
            description: tx.description,
            amount: tx.amount,
            isMerged: true,
            studentPayments: [
              {
                id: tx.id,
                name: tx.studentName,
                amount: tx.amount,
              },
            ],
          };
          incomeGroups[key] = newGroup;
          grouped.push(newGroup);
        }
      }
    });

    // Re-sort grouped transactions by date descending
    grouped.sort((a, b) => b.date.localeCompare(a.date));
    return grouped;
  };

  const displayTransactions = getGroupedTransactions(filteredTransactions);

  // Calculate bill payments for the selected child
  const getStudentBillsSummary = () => {
    if (!activeStudent) return [];
    
    // Filter bills for active class
    const classBills = bills.filter(b => b.className === activeClassName);

    return classBills.map(bill => {
      // Sum student payments for this bill category
      const paid = classTransactions
        .filter(t => t.studentId === activeStudent.id && t.type === 'income' && t.description.trim().toLowerCase() === bill.title.trim().toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = Math.max(0, bill.amount - paid);

      return {
        title: bill.title,
        amount: bill.amount,
        paid,
        remaining,
      };
    });
  };

  const studentBillsSummary = getStudentBillsSummary();

  // Calculate KAS income sources breakdown for the class
  const getClassIncomeSources = () => {
    const incomeTransactions = classTransactions.filter(t => t.type === 'income');
    const totalIncomeVal = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

    const sourceMap: Record<string, { description: string; total: number; count: number }> = {};
    incomeTransactions.forEach(t => {
      const desc = t.description ? t.description.trim() : 'Pemasukan Lainnya';
      if (!sourceMap[desc]) {
        sourceMap[desc] = { description: desc, total: 0, count: 0 };
      }
      sourceMap[desc].total += t.amount;
      sourceMap[desc].count += 1;
    });

    return {
      totalClassIncome: totalIncomeVal,
      sources: Object.values(sourceMap).sort((a, b) => b.total - a.total)
    };
  };

  const { totalClassIncome, sources: incomeSources } = getClassIncomeSources();

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
              ? ['rgb(16, 185, 129)', 'rgb(239, 68, 68)']
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
      
      {/* 1. PRINT HEADER SECTION - MOVED TO THE TOP AND MATCHED FILTER STYLING */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-xs no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Print Filter Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl text-[10px] font-bold w-fit">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'income', label: 'Pemasukan' },
                { id: 'expense', label: 'Pengeluaran' },
                { id: 'date_range', label: 'Rentang Tanggal' },
                { id: 'month', label: 'Per Bulan' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPrintFilterType(item.id as any)}
                  className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    printFilterType === item.id ? 'bg-white text-slate-850 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-50 cursor-pointer transition-all whitespace-nowrap self-start sm:self-auto"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan Keuangan</span>
          </button>
        </div>

        {/* Conditional Inputs based on Filter */}
        {['date_range', 'month'].includes(printFilterType) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl pt-2 border-t border-slate-50 animate-slide-in">
            {printFilterType === 'date_range' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Dari Tanggal</label>
                  <input
                    type="date"
                    value={printStartDate}
                    onChange={(e) => setPrintStartDate(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={printEndDate}
                    onChange={(e) => setPrintEndDate(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </>
            )}

            {printFilterType === 'month' && (
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Pilih Bulan</label>
                <select
                  value={printMonth}
                  onChange={(e) => setPrintMonth(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                >
                  <option value="" disabled>Pilih Bulan</option>
                  {getAvailableMonths().map((m) => (
                    <option key={m} value={m}>
                      {formatMonthYear(m)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selector and Options Panel */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs no-print">
        <div>
          <h3 className="font-extrabold text-slate-850 text-base">Pilih Data Keuangan Anak</h3>
          <p className="text-xs text-slate-455 font-semibold mt-0.5">
            Pilih anak untuk melihat rincian laporan keuangan kelas mereka.
          </p>
        </div>

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

          {/* TOTAL TAGIHAN KAS BERDASARKAN KATEGORI */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-xs">
            <div>
              <h4 className="font-extrabold text-slate-850 text-sm">Status Tagihan Murid ({activeStudent?.name})</h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Rincian status tagihan wajib yang harus diselesaikan untuk anak Anda.</p>
            </div>

            {studentBillsSummary.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold italic text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                Belum ada tagihan wajib yang ditetapkan oleh Wali Kelas.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {studentBillsSummary.map((b, idx) => (
                  <div key={idx} className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-xs">{b.title}</span>
                      {b.remaining === 0 ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-extrabold rounded-full border border-emerald-100 flex items-center gap-0.5 select-none">
                          <CheckCircle className="w-3 h-3" /> Lunas
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-50 text-red-800 text-[9px] font-extrabold rounded-full border border-red-100 flex items-center gap-0.5 select-none">
                          <AlertCircle className="w-3 h-3" /> Belum Lunas
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500 pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="block text-[8px] uppercase font-bold text-slate-400 leading-none mb-1">Tagihan:</span>
                        <span className="text-slate-800">Rp {b.amount.toLocaleString('id-ID')}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase font-bold text-slate-400 leading-none mb-1">Dibayar:</span>
                        <span className="text-emerald-600 font-bold">Rp {b.paid.toLocaleString('id-ID')}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase font-bold text-slate-400 leading-none mb-1">Sisa:</span>
                        <span className={`font-extrabold ${b.remaining > 0 ? 'text-red-500' : 'text-slate-500'}`}>Rp {b.remaining.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Pie Chart & Income Sources */}
        <div className="space-y-6 no-print">
          {/* Pie Chart Card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
            <div>
              <h3 className="font-extrabold text-slate-850 text-sm">Persentase Keuangan</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Perbandingan rasio kas masuk dan keluar.</p>
            </div>
            <div className="relative h-48 w-full flex items-center justify-center">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          {/* Income Sources Card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
            <div>
              <h3 className="font-extrabold text-slate-850 text-sm">Rincian Sumber Pemasukan KAS</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Rincian sumber dana kas kelas ({activeClassName}) yang telah diterima.</p>
            </div>

            {incomeSources.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold italic text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                Belum ada pemasukan kas yang tercatat.
              </p>
            ) : (
              <div className="space-y-4">
                {incomeSources.map((source, index) => {
                  const percentage = totalClassIncome > 0 ? Math.round((source.total / totalClassIncome) * 100) : 0;
                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-extrabold text-slate-850">{source.description}</span>
                          <span className="text-[10px] text-slate-400 font-bold">({source.count}x)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800">Rp {source.total.toLocaleString('id-ID')}</span>
                          <span className="ml-2 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold rounded-md border border-emerald-100">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REPORT LEDGER TABLE & DETAILS */}
      <div id="print-area-parent" className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-850 text-base">Laporan Pembukuan Keuangan Kelas ({activeClassName})</h3>
          </div>
        </div>

        {/* Print Header (Only visible on print layouts) */}
        <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-4">
          <h1 className="text-2xl font-black text-center text-slate-900 tracking-tight uppercase">Laporan Keuangan Kas Kelas</h1>
          <h2 className="text-lg font-bold text-center text-slate-700">Kelas: {activeClassName}</h2>
          <p className="text-xs text-center text-slate-500 font-bold mt-1">
            Periode: {
              printFilterType === 'month'
                ? formatMonthYear(printMonth)
                : printFilterType === 'date_range'
                ? `${printStartDate ? new Intl.DateTimeFormat('id-ID').format(new Date(printStartDate)) : ''} s/d ${printEndDate ? new Intl.DateTimeFormat('id-ID').format(new Date(printEndDate)) : ''}`
                : printFilterType === 'income'
                ? 'Pemasukan Saja'
                : printFilterType === 'expense'
                ? 'Pengeluaran Saja'
                : 'Semua Transaksi'
            }
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
                    <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/10 transition-colors align-top">
                      <td className="py-3.5 px-3 text-slate-400 text-[10px] align-top">{idx + 1}</td>
                      <td className="py-3.5 px-3 align-top">{formattedTxDate}</td>
                      <td className="py-3.5 px-3 align-top">
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
                      <td className="py-3.5 px-3 align-top">
                        <div className="space-y-1">
                          {tx.type === 'income' ? (
                            tx.isMerged ? (
                              <div>
                                <div className="h-6 flex items-center font-extrabold text-slate-900">{tx.description}</div>
                                <div className="space-y-1.5 pl-6 border-l-2 border-slate-100 mt-1">
                                  {tx.studentPayments.map((p: any, pIdx: number) => (
                                    <div key={pIdx} className="h-5 flex items-center text-slate-500 font-semibold text-xs">
                                      {p.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : tx.studentName ? (
                              <div>
                                <span className="font-extrabold text-slate-800">{tx.description}</span>
                                <div className="pl-6 border-l-2 border-slate-100 mt-1 text-slate-500 font-semibold text-xs h-5 flex items-center">
                                  {tx.studentName}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span>Pemasukan <span className="font-bold text-slate-900">Lainnya</span></span>
                                <span className="text-slate-400 text-[10px] ml-1 font-semibold">({tx.description})</span>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-2 h-6">
                              <span>{tx.description}</span>
                              {tx.photoPath && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const src = tx.photoPath!.startsWith('data:image')
                                      ? tx.photoPath!
                                      : (tx.photoPath!.startsWith('/') ? tx.photoPath! : `/${tx.photoPath!}`);
                                    setActivePhotoUrl(src);
                                  }}
                                  className="py-0.5 px-1.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 rounded-md text-[9px] font-bold flex items-center gap-1 cursor-pointer no-print transition-colors"
                                  title="Lihat Bukti Nota"
                                >
                                  <ImageIcon className="w-3 h-3 text-indigo-600" />
                                  <span>Bukti Nota</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800 align-top">
                        {tx.type === 'income' ? (
                          tx.isMerged ? (
                            <div>
                              <div className="h-6 flex items-center justify-end font-black text-slate-900">
                                Rp {tx.amount.toLocaleString('id-ID')}
                              </div>
                              <div className="space-y-1.5 mt-1">
                                {tx.studentPayments.map((p: any, pIdx: number) => (
                                  <div key={pIdx} className="h-5 flex items-center justify-end text-slate-400 text-[10px] font-bold">
                                    Rp {p.amount.toLocaleString('id-ID')}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="h-6 flex items-center justify-end font-black text-slate-900">
                                Rp {tx.amount.toLocaleString('id-ID')}
                              </div>
                              <div className="pl-6 mt-1 text-slate-400 text-[10px] font-bold h-5 flex items-center justify-end">
                                Rp {tx.amount.toLocaleString('id-ID')}
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="h-6 flex items-center justify-end font-black text-red-500">
                            Rp {tx.amount.toLocaleString('id-ID')}
                          </div>
                        )}
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

      {/* LIGHTBOX MODAL FOR VIEWING EXPENSE RECEIPT PHOTO */}
      {activePhotoUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 relative shadow-2xl space-y-4 animate-scale-up">
            <button
              type="button"
              onClick={() => setActivePhotoUrl(null)}
              className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ImageIcon className="w-5 h-5 text-indigo-600" />
              <span className="font-extrabold text-sm text-slate-850">Lampiran Bukti Nota Pengeluaran</span>
            </div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-950">
              <img src={activePhotoUrl} alt="Receipt proof detailed" className="w-full h-full object-contain" />
            </div>
            <div className="text-center pt-1.5">
              <button
                type="button"
                onClick={() => setActivePhotoUrl(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

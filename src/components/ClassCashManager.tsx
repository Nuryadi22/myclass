'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { storeCashTransactionAction, deleteCashTransactionAction, storeClassBillAction, deleteClassBillAction } from '@/app/actions/teacher';
import Chart from 'chart.js/auto';
import { Loader2, Plus, Minus, Trash2, Printer, Calendar, Banknote, Receipt, Wallet, AlertCircle, Camera, Check, Upload, Image as ImageIcon, Eye, X } from 'lucide-react';

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
  photoPath: string | null;
  cashSource: string | null;
}

interface ClassBill {
  id: number;
  title: string;
  amount: number;
}

interface ClassCashManagerProps {
  className: string;
  students: Student[];
  bills: ClassBill[];
  initialTransactions: Transaction[];
}

export default function ClassCashManager({
  className,
  students,
  bills,
  initialTransactions,
}: ClassCashManagerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [tab, setTab] = useState<'income' | 'expense'>('income');
  const [reportTab, setReportTab] = useState<'all' | 'income' | 'expense'>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Print Filter States
  const [printFilterType, setPrintFilterType] = useState<'all' | 'date_range' | 'student' | 'month'>('all');
  const [printStartDate, setPrintStartDate] = useState<string>('');
  const [printEndDate, setPrintEndDate] = useState<string>('');
  const [printStudentId, setPrintStudentId] = useState<string>('');
  const [printMonth, setPrintMonth] = useState<string>('');

  // Live Camera Photo Capture States for Expenses
  const [expensePhotoMode, setExpensePhotoMode] = useState<'none' | 'upload' | 'camera'>('none');
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotoBase64, setCapturedPhotoBase64] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Bill Settings Form States
  const [billError, setBillError] = useState<string | null>(null);
  const [billSuccess, setBillSuccess] = useState<string | null>(null);

  // Lightbox Modal for Receipt Photo
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());

  useEffect(() => {
    // Set default printing filter month to current month
    const today = new Date();
    setPrintMonth(today.toISOString().substring(0, 7));

    // Cleanup camera stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Get available months for transactions print filter
  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    const today = new Date();
    monthsSet.add(today.toISOString().substring(0, 7));
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
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  // Live video preview start
  const startCamera = async () => {
    setCameraError(null);
    setCapturedPhotoBase64(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStreamActive(true);
      }
    } catch (err) {
      console.error(err);
      setCameraError('Gagal mengakses kamera. Gunakan upload file sebagai alternatif.');
    }
  };

  // Close live video stream
  const stopCamera = () => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {
        console.warn('Error pausing video:', e);
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStreamActive(false);
  };

  // Capture photo from video feed
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        stopCamera();
        setCapturedPhotoBase64(dataUrl);
      }
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
    }
  };

  // Reset captured camera photo
  const resetCameraCapture = () => {
    setCapturedPhotoBase64(null);
    startCamera();
  };

  // Filtered transactions for overview cards (by date range, student, month, but NOT reportTab)
  const getCardTransactions = () => {
    return transactions.filter((t) => {
      if (printFilterType === 'date_range') {
        if (printStartDate && t.date < printStartDate) return false;
        if (printEndDate && t.date > printEndDate) return false;
        return true;
      }
      if (printFilterType === 'student') {
        if (!printStudentId) return true;
        return t.studentId?.toString() === printStudentId;
      }
      if (printFilterType === 'month') {
        if (!printMonth) return true;
        return t.date.startsWith(printMonth);
      }
      return true; // printFilterType === 'all'
    });
  };

  const cardTransactions = getCardTransactions();

  const getGroupedIncomeTransactions = (txList: typeof transactions) => {
    const grouped: any[] = [];
    const incomeGroups: Record<string, any> = {};

    txList.forEach((tx) => {
      if (!tx.studentId) {
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

    return grouped.sort((a, b) => b.date.localeCompare(a.date));
  };

  const getExpenseTransactions = (txList: typeof transactions) => {
    return txList.map(tx => ({
      ...tx,
      ids: [tx.id],
      isMerged: false,
      studentPayments: []
    })).sort((a, b) => b.date.localeCompare(a.date));
  };

  const incomeCardTransactions = cardTransactions.filter(t => t.type === 'income');
  const expenseCardTransactions = cardTransactions.filter(t => t.type === 'expense');

  const displayIncomeTransactions = getGroupedIncomeTransactions(incomeCardTransactions);
  const displayExpenseTransactions = getExpenseTransactions(expenseCardTransactions);

  // Financial Calculations (using cardTransactions to stay independent of reportTab)
  const totalIncome = cardTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = cardTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Calculate combined KAS income and expense sources breakdown (using cardTransactions)
  const getCashBreakdown = () => {
    const categories: Record<string, { income: number; expense: number; incomeCount: number; expenseCount: number }> = {};

    // 1. Initialize with active bills
    bills.forEach(b => {
      categories[b.title] = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
    });

    // Add default categories
    const defaultCats = ['Pemasukan Lainnya'];
    defaultCats.forEach(cat => {
      if (!categories[cat]) {
        categories[cat] = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
      }
    });

    // 2. Process card transactions
    cardTransactions.forEach(t => {
      if (t.type === 'income') {
        const cat = t.description ? t.description.trim() : 'Pemasukan Lainnya';
        if (!categories[cat]) {
          categories[cat] = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
        }
        categories[cat].income += t.amount;
        categories[cat].incomeCount += 1;
      } else if (t.type === 'expense') {
        const cat = t.cashSource ? t.cashSource.trim() : 'Kas Utama';
        if (!categories[cat]) {
          categories[cat] = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
        }
        categories[cat].expense += t.amount;
        categories[cat].expenseCount += 1;
      }
    });

    return Object.entries(categories)
      .map(([name, data]) => ({
        name,
        ...data
      }))
      .filter(c => c.name !== 'Kas Utama' && (c.income > 0 || c.expense > 0 || bills.some(b => b.title === c.name)))
      .sort((a, b) => b.income - a.income || b.expense - a.expense);
  };

  const categoriesData = getCashBreakdown();

  // Chart Rendering
  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    const hasData = totalIncome > 0 || totalExpense > 0;

    chartInstance.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: hasData ? ['Pemasukan', 'Pengeluaran'] : ['Belum Ada Transaksi'],
        datasets: [
          {
            data: hasData ? [totalIncome, totalExpense] : [1],
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
            position: 'right',
            labels: {
              boxWidth: 12,
              font: { weight: 'bold', size: 10 },
              padding: 10,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [totalIncome, totalExpense, printFilterType, printStartDate, printEndDate, printStudentId, printMonth]);

  const handleSubmitTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    formData.append('type', tab);
    if (tab === 'expense' && capturedPhotoBase64) {
      formData.append('photo_base64', capturedPhotoBase64);
    }

    const formEl = e.currentTarget;

    startTransition(async () => {
      const result = await storeCashTransactionAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Transaksi kas berhasil disimpan.');
        stopCamera();
        setCapturedPhotoBase64(null);
        setExpensePhotoMode('none');
        formEl.reset();
        window.location.reload();
      }
    });
  };

  const handleDeleteTransaction = (ids: number[]) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi kas ini?')) return;

    startTransition(async () => {
      let success = true;
      let errorMsg = '';
      for (const id of ids) {
        const result = await deleteCashTransactionAction(id);
        if (!result?.success) {
          success = false;
          errorMsg = result?.error || 'Gagal menghapus salah satu transaksi.';
        }
      }
      if (success) {
        window.location.reload();
      } else {
        alert(errorMsg);
      }
    });
  };

  const handleSubmitBill = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBillError(null);
    setBillSuccess(null);

    const formData = new FormData(e.currentTarget);
    const formEl = e.currentTarget;

    startTransition(async () => {
      const result = await storeClassBillAction(null, formData);
      if (result?.error) {
        setBillError(result.error);
      } else if (result?.success) {
        setBillSuccess(result.message || 'Tagihan berhasil ditambahkan.');
        formEl.reset();
        window.location.reload();
      }
    });
  };

  const handleDeleteBill = (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tagihan kelas ini?')) return;

    startTransition(async () => {
      const result = await deleteClassBillAction(id);
      if (result?.success) {
        window.location.reload();
      } else {
        alert(result?.error || 'Gagal menghapus tagihan.');
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      
      {/* 1. PRINT/REPORT OPTIONS - PLACED AT THE VERY TOP */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-3xs print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Print Filter Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl text-[10px] font-bold w-fit">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'date_range', label: 'Rentang Tanggal' },
                { id: 'student', label: 'Per Siswa' },
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
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-150 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Keuangan Sekarang</span>
          </button>
        </div>
          {/* Conditional Inputs based on Filter */}
          {['date_range', 'student', 'month'].includes(printFilterType) && (
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

              {printFilterType === 'student' && (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Pilih Siswa</label>
                  <select
                    value={printStudentId}
                    onChange={(e) => setPrintStudentId(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="">-- Semua Siswa --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.studentId})
                      </option>
                    ))}
                  </select>
                </div>
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

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 print:hidden">
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Saldo Tersedia</span>
            <h3 className="text-xl font-extrabold text-emerald-850">Rp {balance.toLocaleString('id-ID')}</h3>
            <span className="text-[9px] text-emerald-555 text-emerald-500 font-bold block">Pemasukan dikurangi pengeluaran</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pemasukan</span>
            <h3 className="text-xl font-extrabold text-emerald-600">Rp {totalIncome.toLocaleString('id-ID')}</h3>
            <span className="text-[9px] text-slate-400 font-semibold block">Dari iuran kas dan tagihan</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-emerald-650 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pengeluaran</span>
            <h3 className="text-xl font-extrabold text-red-500">Rp {totalExpense.toLocaleString('id-ID')}</h3>
            <span className="text-[9px] text-slate-400 font-semibold block">Belanja & kebutuhan kelas</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-red-500 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. CHART & DETAILS PANEL (Parallel/Sejajar) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch print:hidden">
        {/* Financial Ratio card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-3xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-850 text-base">Rasio Keuangan Kelas</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Persentase perbandingan kas masuk dan keluar terfilter.</p>
          </div>
          <div className="relative h-60 w-full flex items-center justify-center flex-grow">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        {/* Financial Details Breakdown (Pemasukan & Pengeluaran) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-3xs flex flex-col justify-between">
          <div className="space-y-4 flex-grow">
            <div>
              <h3 className="font-extrabold text-slate-850 text-base">Rincian Alokasi Kas per Kategori</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Rincian perbandingan alokasi kas masuk dan keluar terfilter per kategori.</p>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {categoriesData.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold italic text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                  Belum ada alokasi kas yang tercatat.
                </p>
              ) : (
                categoriesData.map((cat, index) => {
                  const incomePercent = totalIncome > 0 ? Math.round((cat.income / totalIncome) * 100) : 0;
                  const spentPercent = cat.income > 0 ? Math.round((cat.expense / cat.income) * 100) : 0;

                  return (
                    <div key={index} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                        <span className="font-extrabold text-slate-800">{cat.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          ({cat.incomeCount}x masuk{cat.expenseCount > 0 ? `, ${cat.expenseCount}x keluar` : ''})
                        </span>
                      </div>

                      <div className="space-y-3">
                        {/* Income Bar (only if there is income) */}
                        {(cat.income > 0 || cat.name !== 'Kas Utama') && (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-500 font-bold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Pemasukan
                              </span>
                              <div className="text-right">
                                <span className="font-bold text-slate-850">Rp {cat.income.toLocaleString('id-ID')}</span>
                                {totalIncome > 0 && (
                                  <span className="ml-1.5 px-1 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold rounded-md border border-emerald-100">
                                    {incomePercent}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${incomePercent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Expense Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 font-bold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Pengeluaran
                            </span>
                            <div className="text-right">
                              <span className="font-bold text-slate-850">Rp {cat.expense.toLocaleString('id-ID')}</span>
                              {cat.income > 0 ? (
                                <span className={`ml-1.5 px-1 py-0.5 text-[9px] font-extrabold rounded-md border ${
                                  cat.expense > 0 
                                    ? (spentPercent > 100 ? 'bg-red-150 text-red-800 border-red-200' : 'bg-red-50 text-red-700 border-red-100')
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                  {spentPercent}% terpakai
                                </span>
                              ) : (
                                totalExpense > 0 && cat.expense > 0 && (
                                  <span className="ml-1.5 px-1 py-0.5 bg-red-50 text-red-700 text-[9px] font-extrabold rounded-md border border-red-100">
                                    {Math.round((cat.expense / totalExpense) * 100)}%
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full transition-all duration-500"
                              style={{ width: `${cat.income > 0 ? Math.min(100, spentPercent) : (totalExpense > 0 ? Math.round((cat.expense / totalExpense) * 100) : 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE BILLS PANEL (Full Width / Sejajar di bawah) */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-3xs print:hidden">
        <div>
          <h4 className="font-extrabold text-slate-850 text-sm">Daftar Tagihan Kelas Aktif</h4>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Daftar iuran wajib yang ditetapkan untuk murid di kelas ini.</p>
        </div>
        
        {bills.length === 0 ? (
          <p className="text-xs text-slate-400 font-semibold py-6 text-center italic border border-dashed border-slate-200 rounded-2xl">
            Belum ada tagihan kelas yang diatur.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {bills.map((bill) => (
              <div key={bill.id} className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-shadow">
                <div>
                  <p className="font-extrabold text-slate-800 text-xs">{bill.title}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Wajib Bayar: Rp {bill.amount.toLocaleString('id-ID')}</p>
                </div>
                <button
                  onClick={() => handleDeleteBill(bill.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  title="Hapus Tagihan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. ACTIONS & CONFIGURATION PANEL (Parallel/Sejajar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start print:hidden">
        {/* INPUT TRANSACTION FORM */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-3xs">
          <div className="flex border-b border-slate-100 pb-4 justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-850 text-base">Catat Transaksi Baru</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Input pemasukan murid atau pengeluaran operasional.</p>
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
              <AlertCircle className="w-4 h-4 text-red-650 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Gagal menyimpan: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-start gap-3 text-xs animate-slide-in">
              <Check className="w-4 h-4 text-emerald-655 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Berhasil: </span>
                <span>{success}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitTransaction} className="space-y-4" encType="multipart/form-data">
            {tab === 'income' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div>
                    <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Keterangan Tambahan
                    </label>
                    <select
                      id="description"
                      name="description"
                      required
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      <option value="Iuran Kas">Iuran Kas</option>
                      <option value="Bayar Buku">Bayar Buku</option>
                      <option value="Pemasukan Lainnya">Pemasukan Lainnya</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Detail Pengeluaran (Keterangan)
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
                    <label htmlFor="cash_source" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Pilih Sumber Kas
                    </label>
                    <select
                      id="cash_source"
                      name="cash_source"
                      required
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      <option value="">-- Pilih Sumber Kas --</option>
                      {bills.map((bill) => (
                        <option key={bill.id} value={bill.title}>
                          {bill.title}
                        </option>
                      ))}
                      <option value="Pemasukan Lainnya">Pemasukan Lainnya</option>
                    </select>
                  </div>

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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Foto Bukti
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpensePhotoMode('upload');
                          stopCamera();
                          setCapturedPhotoBase64(null);
                        }}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          expensePhotoMode === 'upload' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExpensePhotoMode('camera');
                          startCamera();
                        }}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          expensePhotoMode === 'camera' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Foto (Kamera)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* EXPENSE: Upload File or Camera View renders below the inline fields */}
            {tab === 'expense' && expensePhotoMode !== 'none' && (
              <div className="pt-2 border-t border-slate-100 space-y-4">
                {expensePhotoMode === 'upload' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-slide-in">
                    <input
                      type="file"
                      name="photo_file"
                      accept="image/*"
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-350 cursor-pointer"
                    />
                  </div>
                )}

                {expensePhotoMode === 'camera' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col items-center animate-slide-in">
                    {cameraError && (
                      <p className="text-xs text-red-600 font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" />{cameraError}</p>
                    )}
                    
                    {!capturedPhotoBase64 && !cameraError && (
                      <div className="w-full max-w-xs aspect-video bg-slate-900 rounded-xl overflow-hidden relative shadow-inner">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      </div>
                    )}

                    {capturedPhotoBase64 && (
                      <div className="w-full max-w-xs aspect-video bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200">
                        <img src={capturedPhotoBase64} alt="Captured receipt" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      {cameraStreamActive && (
                        <button
                          type="button"
                          onClick={captureSnapshot}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Ambil Snapshot
                        </button>
                      )}
                      {capturedPhotoBase64 && (
                        <button
                          type="button"
                          onClick={resetCameraCapture}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Foto Ulang
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          setExpensePhotoMode('none');
                          setCapturedPhotoBase64(null);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-55 shadow-emerald-50'
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

        {/* CLASS BILLS MANAGER - CONFIGURATION BOARD */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-3xs">
          <div>
            <h3 className="font-extrabold text-slate-850 text-base">Buat Tagihan Keuangan Kelas</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Tetapkan iuran yang wajib dibayarkan oleh setiap murid di kelas ini.</p>
          </div>

          {billError && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-2xl flex items-start gap-3 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-red-655" />
              <span>{billError}</span>
            </div>
          )}

          {billSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-start gap-3 text-xs">
              <Check className="w-4 h-4 text-emerald-655" />
              <span>{billSuccess}</span>
            </div>
          )}

          {/* Create new Class Bill */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
            <form onSubmit={handleSubmitBill} className="space-y-3">
              <div>
                <label htmlFor="bill_title" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Judul Tagihan</label>
                <select
                  id="bill_title"
                  name="title"
                  required
                  className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                >
                  <option value="Iuran Kas">Iuran Kas</option>
                  <option value="Bayar Buku">Bayar Buku</option>
                  <option value="Tagihan Lainnya">Tagihan Lainnya</option>
                </select>
              </div>

              <div>
                <label htmlFor="bill_amount" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Jumlah Wajib Bayar (Rp)</label>
                <input
                  id="bill_amount"
                  name="amount"
                  type="number"
                  min="1000"
                  required
                  placeholder="Misal: 50000"
                  className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Buat Tagihan</span>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 5. DETAILED TRANSACTION LEDGER TABLE (Contains print ID) */}
      <div id="print-area" className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-3xs">
        <div>
          <h3 className="font-extrabold text-slate-850 text-lg">Laporan Pembukuan Keuangan Kelas ({className})</h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5 print:hidden">
            Rincian seluruh pencatatan transaksi masuk dan keluar kas keuangan kelas.
          </p>
        </div>

        {/* Print Header (Only visible on print layouts) */}
        <div className="hidden print:block border-b-2 border-slate-850 pb-4 mb-4">
          <h1 className="text-2xl font-black text-center text-slate-900 tracking-tight uppercase">Laporan Keuangan Kas Kelas</h1>
          <h2 className="text-lg font-bold text-center text-slate-700">Kelas: {className}</h2>
          <p className="text-xs text-center text-slate-500 font-bold mt-1">
            Filter Cetak: {
              printFilterType === 'month'
                ? formatMonthYear(printMonth)
                : printFilterType === 'date_range'
                ? `Rentang ${printStartDate} s/d ${printEndDate}`
                : printFilterType === 'student'
                ? 'Per Siswa'
                : 'Semua Transaksi'
            }
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

        {/* Transactions Table List */}
        {/* Transactions Table Lists */}
        <div className="space-y-8">
          {/* INCOME TABLE */}
          {(reportTab === 'all' || reportTab === 'income') && (
            <div className="space-y-3">
              {(reportTab === 'all') && (
                <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Tabel Pemasukan Kas</h4>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-3 w-12">No</th>
                      <th className="py-3 px-3 w-32">Tanggal</th>
                      <th className="py-3 px-3 w-40">Kategori / Iuran</th>
                      <th className="py-3 px-3">Detail Pembayar</th>
                      <th className="py-3 px-3 text-right w-36">Nominal</th>
                      <th className="py-3 px-3 text-center w-20 print:hidden">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-slate-700">
                    {displayIncomeTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                          Tidak ada catatan pemasukan kas dalam periode ini.
                        </td>
                      </tr>
                    ) : (
                      displayIncomeTransactions.map((tx, idx) => {
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
                              <span className="font-extrabold text-slate-900">{tx.description}</span>
                            </td>
                            <td className="py-3.5 px-3 align-top">
                              {tx.isMerged ? (
                                <div className="space-y-1.5 pl-3 border-l-2 border-slate-100">
                                  {tx.studentPayments.map((p: any, pIdx: number) => (
                                    <div key={pIdx} className="h-5 flex items-center text-slate-500 font-semibold text-xs">
                                      {p.name}
                                    </div>
                                  ))}
                                </div>
                              ) : tx.studentName ? (
                                <div className="pl-3 border-l-2 border-slate-100 text-slate-500 font-semibold text-xs h-5 flex items-center">
                                  {tx.studentName}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs">Bukan Murid / Lainnya</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-850 align-top">
                              {tx.isMerged ? (
                                <div>
                                  <div className="h-6 flex items-center justify-end font-black text-emerald-600">
                                    Rp {tx.amount.toLocaleString('id-ID')}
                                  </div>
                                  <div className="space-y-1.5">
                                    {tx.studentPayments.map((p: any, pIdx: number) => (
                                      <div key={pIdx} className="h-5 flex items-center justify-end text-slate-400 text-[10px] font-bold">
                                        Rp {p.amount.toLocaleString('id-ID')}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="font-black text-emerald-600">
                                  Rp {tx.amount.toLocaleString('id-ID')}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-center print:hidden align-top">
                              <button
                                onClick={() => handleDeleteTransaction(tx.ids)}
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
                  {reportTab === 'income' && displayIncomeTransactions.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50/70 font-extrabold border-t border-slate-200">
                        <td colSpan={4} className="py-3.5 px-3 text-right text-slate-500 uppercase tracking-wide">Total Pemasukan:</td>
                        <td className="py-3.5 px-3 text-right text-emerald-600 font-mono">
                          Rp {totalIncome.toLocaleString('id-ID')}
                        </td>
                        <td className="print:hidden"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* EXPENSE TABLE */}
          {(reportTab === 'all' || reportTab === 'expense') && (
            <div className="space-y-3">
              {(reportTab === 'all') && (
                <div className="flex items-center gap-2 border-l-4 border-red-500 pl-3">
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Tabel Pengeluaran Kas</h4>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-3 w-12">No</th>
                      <th className="py-3 px-3 w-32">Tanggal</th>
                      <th className="py-3 px-3 w-40">Kategori / Sumber Kas</th>
                      <th className="py-3 px-3">Detail Pengeluaran</th>
                      <th className="py-3 px-3 text-right w-36">Nominal</th>
                      <th className="py-3 px-3 text-center w-24 print:hidden">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-slate-700">
                    {displayExpenseTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                          Tidak ada catatan pengeluaran kas dalam periode ini.
                        </td>
                      </tr>
                    ) : (
                      displayExpenseTransactions.map((tx, idx) => {
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
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-extrabold rounded-md border border-slate-200">
                                {tx.cashSource || 'Pemasukan Lainnya'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 align-top">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-800">{tx.description}</span>
                                {tx.photoPath && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const src = tx.photoPath!.startsWith('data:image')
                                        ? tx.photoPath!
                                        : (tx.photoPath!.startsWith('/') ? tx.photoPath! : `/${tx.photoPath!}`);
                                      setActivePhotoUrl(src);
                                    }}
                                    className="py-0.5 px-1.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 rounded-md text-[9px] font-bold flex items-center gap-1 cursor-pointer print:hidden transition-colors"
                                    title="Lihat Bukti Nota"
                                  >
                                    <ImageIcon className="w-3 h-3 text-indigo-600" />
                                    <span>Bukti Nota</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-bold text-red-500 align-top">
                              Rp {tx.amount.toLocaleString('id-ID')}
                            </td>
                            <td className="py-3.5 px-3 text-center print:hidden align-top">
                              <button
                                onClick={() => handleDeleteTransaction(tx.ids)}
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
                  {reportTab === 'expense' && displayExpenseTransactions.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50/70 font-extrabold border-t border-slate-200">
                        <td colSpan={4} className="py-3.5 px-3 text-right text-slate-500 uppercase tracking-wide">Total Pengeluaran:</td>
                        <td className="py-3.5 px-3 text-right text-red-500 font-mono">
                          Rp {totalExpense.toLocaleString('id-ID')}
                        </td>
                        <td className="print:hidden"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* COMBINED FOOTER TOTALS (Only visible when showing ALL) */}
          {reportTab === 'all' && (displayIncomeTransactions.length > 0 || displayExpenseTransactions.length > 0) && (
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-2 max-w-md ml-auto">
              <div className="flex justify-between items-center text-xs font-extrabold">
                <span className="text-slate-500">TOTAL PEMASUKAN:</span>
                <span className="text-emerald-600 font-mono text-sm">Rp {totalIncome.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-extrabold border-b border-slate-200 pb-2">
                <span className="text-slate-500">TOTAL PENGELUARAN:</span>
                <span className="text-red-500 font-mono text-sm">Rp {totalExpense.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-black pt-1">
                <span className="text-indigo-900">SALDO AKHIR TERFILTER:</span>
                <span className="text-indigo-900 font-mono text-sm">Rp {balance.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. LIGHTBOX MODAL FOR VIEWING EXPENSE RECEIPT PHOTO */}
      {activePhotoUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 relative shadow-2xl space-y-4 animate-scale-up">
            <button
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

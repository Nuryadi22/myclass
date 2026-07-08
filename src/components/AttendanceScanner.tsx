'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { recordAttendanceAction } from '@/app/actions/teacher';
import { QrCode, Keyboard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  studentId: string;
}

interface AttendanceScannerProps {
  students: Student[];
}

export default function AttendanceScanner({ students }: AttendanceScannerProps) {
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // QR Code Scanner Effect
  useEffect(() => {
    if (activeTab !== 'qr') return;

    let scanner: any = null;

    // Load html5-qrcode dynamically in browser only
    import('html5-qrcode')
      .then((module) => {
        scanner = new module.Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: (width, height) => {
              const min = Math.min(width, height);
              return { width: Math.floor(min * 0.65), height: Math.floor(min * 0.65) };
            },
            aspectRatio: 1.0,
          },
          /* verbose= */ false
        );

        const onScanSuccess = async (decodedText: string) => {
          // Pause scanner
          try {
            await scanner.clear();
          } catch (e) {
            console.error('Failed to clear scanner on success:', e);
          }

          setStatusMsg(null);

          // Submit scan
          startTransition(async () => {
            const res = await recordAttendanceAction({ qr_code_token: decodedText });
            if (res.success) {
              setStatusMsg({ type: 'success', text: res.message });
            } else {
              setStatusMsg({ type: 'error', text: res.message });
            }

            // Restart scanner after 3 seconds
            setTimeout(() => {
              setStatusMsg(null);
              // Restart scanning if we are still on the QR tab
              if (document.getElementById('qr-reader')) {
                scanner.render(onScanSuccess, onScanFailure);
              }
            }, 3000);
          });
        };

        const onScanFailure = (error: any) => {
          // Silent failure is fine since it scans continuously
        };

        scanner.render(onScanSuccess, onScanFailure);
      })
      .catch((err) => {
        console.error('Error loading html5-qrcode:', err);
      });

    return () => {
      if (scanner) {
        scanner.clear().catch((e: any) => console.error('Failed to clean up scanner:', e));
      }
    };
  }, [activeTab]);

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatusMsg(null);

    const formData = new FormData(e.currentTarget);
    const studentId = formData.get('student_id') as string;
    const status = formData.get('status') as string;

    if (!studentId) {
      setStatusMsg({ type: 'error', text: 'Silakan pilih murid terlebih dahulu.' });
      return;
    }

    startTransition(async () => {
      const res = await recordAttendanceAction({ student_id: studentId, status });
      if (res.success) {
        setStatusMsg({ type: 'success', text: res.message });
      } else {
        setStatusMsg({ type: 'error', text: res.message });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 p-1.5 bg-slate-200/60 rounded-2xl w-fit mx-auto border border-slate-200">
        <button
          onClick={() => {
            setActiveTab('qr');
            setStatusMsg(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'qr'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Scan QR Code</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('manual');
            setStatusMsg(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'manual'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          <span>Absensi Manual</span>
        </button>
      </div>

      {/* Notifications */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 text-xs max-w-md mx-auto shadow-xs border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800 animate-slide-in'
              : 'bg-red-50 border-red-100 text-red-800 animate-shake'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-extrabold">{statusMsg.type === 'success' ? 'Berhasil: ' : 'Pemberitahuan: '}</span>
            <span>{statusMsg.text}</span>
          </div>
        </div>
      )}

      {/* Scanner Section */}
      {activeTab === 'qr' ? (
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Arahkan kartu QR Code murid ke kamera</p>
          <div className="w-full max-w-md mx-auto aspect-square bg-slate-900 rounded-3xl overflow-hidden shadow-lg border border-slate-100 relative">
            <div id="qr-reader" className="w-full h-full" />
            {isPending && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white gap-2 font-bold text-sm">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span>Mencatat kehadiran...</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Manual Input Section */
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs max-w-md mx-auto animate-fade-in">
          <div>
            <h3 className="font-extrabold text-slate-850 text-base">Cetak Kehadiran Manual</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">Isi data kehadiran murid tanpa melalui pemindaian QR Code.</p>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label htmlFor="student_id" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Pilih Murid
              </label>
              <select
                id="student_id"
                name="student_id"
                required
                className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
              >
                <option value="">-- Pilih Murid --</option>
                {students.map((student) => (
                  <option key={student.id} value={student.studentId}>
                    {student.name} ({student.studentId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Status Kehadiran
              </label>
              <select
                id="status"
                name="status"
                required
                className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
              >
                <option value="hadir">Hadir</option>
                <option value="sakit">Sakit</option>
                <option value="izin">Izin</option>
                <option value="alfa">Alfa</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-slate-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Simpan Kehadiran</span>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

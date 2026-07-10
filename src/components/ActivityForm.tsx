'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { storeActivityAction, awardActivePointAction } from '@/app/actions/teacher';
import { Loader2, Plus, Star, AlertCircle, CheckCircle2, QrCode, X } from 'lucide-react';

interface Student {
  id: number;
  name: string;
}

interface ActivityFormProps {
  students: Student[];
}

export default function ActivityForm({ students }: ActivityFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [isPending, startTransition] = useTransition();

  // QR code scanner states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedStudents, setScannedStudents] = useState<{ name: string }[]>([]);
  const [scanStatus, setScanStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isSubmittingScan = useRef(false);
  const lastScannedToken = useRef("");
  const lastScanTime = useRef(0);

  // Play audio feedback
  const playBeep = (type: 'success' | 'error') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  useEffect(() => {
    if (!isScannerOpen) {
      setScanStatus(null);
      return;
    }

    let html5QrCode: any = null;

    import('html5-qrcode')
      .then((module) => {
        html5QrCode = new module.Html5Qrcode('poinku-qr-reader');

        const onScanSuccess = async (decodedText: string) => {
          const now = Date.now();
          if (isSubmittingScan.current) return;
          if (decodedText === lastScannedToken.current && now - lastScanTime.current < 2000) {
            return;
          }

          isSubmittingScan.current = true;
          lastScannedToken.current = decodedText;
          lastScanTime.current = now;

          setScanStatus(null);

          const res = await awardActivePointAction(decodedText);
          if (res.success) {
            playBeep('success');
            setScanStatus({ type: 'success', text: `✓ ${res.message}` });
            setScannedStudents(prev => [{ name: res.studentName || 'Murid' }, ...prev]);
          } else {
            playBeep('error');
            setScanStatus({ type: 'error', text: `✗ ${res.message}` });
          }

          isSubmittingScan.current = false;
        };

        const onScanFailure = () => {
          // continuous scans ignore failure events
        };

        html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (width: number, height: number) => {
              const min = Math.min(width, height);
              return { width: Math.floor(min * 0.7), height: Math.floor(min * 0.7) };
            },
            aspectRatio: 1.0,
          },
          onScanSuccess,
          onScanFailure
        ).catch((err: any) => {
          console.error('Error starting html5-qrcode:', err);
          setScanStatus({ type: 'error', text: 'Gagal membuka kamera. Pastikan izin kamera diberikan.' });
        });
      })
      .catch((err) => {
        console.error('Error importing html5-qrcode:', err);
      });

    return () => {
      if (html5QrCode) {
        try {
          html5QrCode.stop().catch((e: any) => console.log('Stop scanner error:', e));
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isScannerOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    formData.append('rating', rating.toString());
    const formEl = e.currentTarget;

    startTransition(async () => {
      const result = await storeActivityAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Aktivitas berhasil ditambahkan.');
        setRating(5);
        formEl.reset();
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
      <div>
        <h3 className="font-extrabold text-slate-850 text-base flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-600" />
          <span>Input Aktivitas Keaktifan</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          Catat aktivitas harian murid (hafalan, literasi, numerasi) untuk menambahkan poin.
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

      {/* Poinku Scan QR Point System */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => {
            setIsScannerOpen(true);
            setScannedStudents([]);
          }}
          className="w-full py-2.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          <span>Poinku (Scan QR Bintang)</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Select */}
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
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Select */}
        <div>
          <label htmlFor="type" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Jenis Keaktifan
          </label>
          <select
            id="type"
            name="type"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all cursor-pointer"
          >
            <option value="memorization">🕌 Hafalan Mandiri / Setoran Ayat</option>
            <option value="literacy">📚 Literasi (Membaca Buku)</option>
            <option value="numeracy">🔢 Numerasi (Matematika & Logika)</option>
          </select>
        </div>

        {/* Title / Description */}
        <div>
          <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Detail Aktivitas / Judul
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Misal: Surah An-Naba Ayat 1-10 / Buku Si Kancil"
          />
        </div>

        {/* Interactive Star Rating Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Rating Penilaian (Poin Dampak)
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 active:scale-95 transition-transform text-2xl cursor-pointer"
                title={`${star} Bintang (${star} Poin)`}
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= rating
                      ? 'fill-amber-400 text-amber-400 filter drop-shadow-sm'
                      : 'text-slate-200 hover:text-amber-200'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-slate-500 font-bold">
              ({rating} Poin keaktifan)
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-slate-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <span>Simpan Aktivitas</span>
          )}
        </button>
      </form>

      {/* Poinku Scan QR Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setIsScannerOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-extrabold text-slate-850 text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <span>Scan QR Poinku</span>
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Arahkan QR Code murid ke kamera. Setiap scan otomatis memberi 1 poin bintang.
              </p>
            </div>

            {/* Live Camera Scanner */}
            <div className="w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-100 shadow-md">
              <div id="poinku-qr-reader" className="w-full h-full" />
              <style dangerouslySetInnerHTML={{__html: `
                #poinku-qr-reader {
                  border: none !important;
                }
                #poinku-qr-reader video {
                  width: 100% !important;
                  height: 100% !important;
                  object-fit: cover !important;
                }
              `}} />
            </div>

            {/* Scan Status Toast/Alert inside modal */}
            {scanStatus && (
              <div className={`p-3.5 rounded-xl text-xs font-bold text-center border ${
                scanStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100 animate-slide-in' : 'bg-red-50 text-red-800 border-red-100 animate-shake'
              }`}>
                {scanStatus.text}
              </div>
            )}

            {/* List of successfully scanned students in this session */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">Siswa Terscan Sesi Ini:</span>
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                {scannedStudents.length === 0 ? (
                  <p className="text-[11px] text-slate-400 font-semibold italic text-center py-4">Belum ada murid terscan.</p>
                ) : (
                  scannedStudents.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-xs font-semibold animate-slide-in">
                      <span className="text-slate-800">{s.name}</span>
                      <span className="text-emerald-600 font-bold flex items-center gap-1">★ +1 Poin</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

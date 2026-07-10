'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { storePunishmentAction } from '@/app/actions/teacher';
import { Loader2, AlertTriangle, AlertCircle, CheckCircle2, QrCode, X, Camera } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  qrCodeToken: string;
  studentId: string;
}

interface PunishmentFormProps {
  students: Student[];
}

export default function PunishmentForm({ students }: PunishmentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // QR Scanning States
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('Menghubungkan kamera...');

  const lastScannedToken = useRef("");
  const lastScanTime = useRef(0);
  const scannerRef = useRef<any>(null);

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
    if (!isScanning) {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop()
            .then(() => {
              scannerRef.current = null;
            })
            .catch((e: any) => console.log('Stop scanner error:', e));
        } catch (e) {
          // ignore
        }
      }
      setScanError(null);
      return;
    }

    setScanStatus('Menghubungkan kamera...');

    import('html5-qrcode')
      .then((module) => {
        // Stop any existing instance
        if (scannerRef.current) {
          try {
            scannerRef.current.stop().catch((e: any) => console.log(e));
          } catch(e){}
        }

        const html5QrCode = new module.Html5Qrcode('punish-qr-reader');
        scannerRef.current = html5QrCode;

        const onScanSuccess = (decodedText: string) => {
          const now = Date.now();
          if (decodedText === lastScannedToken.current && now - lastScanTime.current < 2000) {
            return;
          }

          lastScannedToken.current = decodedText;
          lastScanTime.current = now;
          setScanStatus('Membaca QR Code...');

          const matched = students.find(
            s => s.qrCodeToken.trim().toLowerCase() === decodedText.trim().toLowerCase()
          );
          if (matched) {
            playBeep('success');
            setScanStatus(`✓ Terbaca: ${matched.name}`);
            setSelectedStudent(matched);
            setIsScanning(false);
            setScanError(null);
          } else {
            playBeep('error');
            setScanStatus('✗ QR Tidak Terdaftar');
            setScanError('QR Code tidak terdaftar sebagai murid di kelas ini.');
          }
        };

        const onScanFailure = () => {
          // Silent continuous failure is fine
        };

        html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
          },
          onScanSuccess,
          onScanFailure
        ).then(() => {
          setScanStatus('Kamera Aktif - Arahkan ke QR Code Murid');
        }).catch((err: any) => {
          console.error(err);
          setScanStatus('✗ Gagal Membuka Kamera');
          setScanError('Gagal membuka kamera. Harap beri izin kamera.');
        });
      })
      .catch((err) => {
        console.error(err);
      });

    return () => {
      if (scannerRef.current) {
        try {
          const scannerToStop = scannerRef.current;
          scannerRef.current = null;
          scannerToStop.stop().catch((e: any) => console.log('Clean up stop error:', e));
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isScanning, students]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedStudent) {
      setError('Silakan scan QR Code murid terlebih dahulu untuk memilih murid.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const formEl = e.currentTarget;

    startTransition(async () => {
      const result = await storePunishmentAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Hukuman berhasil dicatat.');
        setSelectedStudent(null);
        setIsScanning(true);
        formEl.reset();
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
      <div>
        <h3 className="font-extrabold text-slate-850 text-base flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span>Pencatatan Pelanggaran (Punishment)</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          Catat pelanggaran disiplin murid dengan memindai kartu QR Code. Tindakan ini akan **mengurangi** poin murid.
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student QR Scanner Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Pilih Murid (Scan QR)
          </label>

          {selectedStudent ? (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between text-xs animate-slide-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-extrabold text-emerald-950">{selectedStudent.name}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">NISN: {selectedStudent.studentId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setIsScanning(true);
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-xl transition-all cursor-pointer shadow-3xs"
              >
                Scan Ulang
              </button>
              <input type="hidden" name="student_id" value={selectedStudent.id} />
            </div>
          ) : isScanning ? (
            <div className="space-y-3">
              <div className="w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-100 shadow-sm max-w-xs mx-auto group">
                <div id="punish-qr-reader" className="w-full h-full" />
                
                {/* CSS Premium Scanning Animation Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* Semi-transparent Dark Background */}
                  <div className="absolute inset-0 bg-slate-950/40" />
                  
                  {/* Scanner box area */}
                  <div className="relative w-2/3 h-2/3 border border-red-500/20 rounded-2xl overflow-hidden bg-transparent shadow-[0_0_15px_rgba(239,68,68,0.1)] flex items-center justify-center">
                    {/* Glowing scanning laser line */}
                    <div className="absolute w-full h-[3px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_10px_#ef4444] left-0 animate-[scan_2.5s_ease-in-out_infinite]" />
                    
                    {/* Corner Bracket decorations */}
                    <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-red-500 rounded-tl-md" />
                    <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-red-500 rounded-tr-md" />
                    <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-red-500 rounded-bl-md" />
                    <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-red-500 rounded-br-md" />
                  </div>
                </div>

                <style dangerouslySetInnerHTML={{__html: `
                  #punish-qr-reader {
                    border: none !important;
                  }
                  #punish-qr-reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                  }
                  @keyframes scan {
                    0% { top: 10%; }
                    50% { top: 90%; }
                    100% { top: 10%; }
                  }
                `}} />
              </div>
              
              <div className={`text-center py-2 px-3 border rounded-xl text-[11px] font-extrabold transition-all max-w-xs mx-auto ${
                scanStatus.startsWith('✓') 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800 animate-bounce' 
                  : scanStatus.startsWith('✗')
                  ? 'bg-red-50 border-red-200 text-red-800 animate-shake'
                  : scanStatus.includes('Membaca')
                  ? 'bg-indigo-50 border-indigo-100 text-indigo-800 animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                {scanStatus}
              </div>

              {scanError && (
                <p className="text-[10px] text-red-650 text-red-600 font-bold text-center animate-shake">{scanError}</p>
              )}
              <button
                type="button"
                onClick={() => setIsScanning(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Batal Pindai</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsScanning(true);
                setScanError(null);
              }}
              className="w-full py-3.5 border-2 border-dashed border-red-200 hover:border-red-400 bg-red-50/10 hover:bg-red-50/30 text-red-600 font-bold rounded-2xl text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-6 h-6 text-red-500 animate-pulse" />
              <span>Pindai QR Code Murid</span>
            </button>
          )}
        </div>

        {/* Violation Reason / Title */}
        <div>
          <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Jenis / Deskripsi Pelanggaran
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Contoh: Merusak fasilitas sekolah / Ribut"
          />
        </div>

        {/* Points Deducted */}
        <div>
          <label htmlFor="points_deducted" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Jumlah Poin Pengurangan
          </label>
          <input
            id="points_deducted"
            name="points_deducted"
            type="number"
            min={1}
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Masukkan angka pengurangan, misal: 5"
          />
          <span className="text-[10px] text-red-500 font-bold block mt-1">
            *Poin murid akan dikurangi sebesar angka ini (tidak akan kurang dari 0).
          </span>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-red-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <span>Catat Pengurangan Poin</span>
          )}
        </button>
      </form>
    </div>
  );
}

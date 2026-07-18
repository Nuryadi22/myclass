'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { storeStudentAction } from '@/app/actions/teacher';
import { Loader2, Plus, AlertCircle, CheckCircle2, Camera } from 'lucide-react';

export default function StudentForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Face enrollment states
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, aspectRatio: 1.0 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setCameraError('Gagal mengakses kamera.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (showCamera && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showCamera, capturedImage]);

  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const vid = videoRef.current;
        const size = Math.min(vid.videoWidth, vid.videoHeight);
        const sx = (vid.videoWidth - size) / 2;
        const sy = (vid.videoHeight - size) / 2;
        ctx.drawImage(vid, sx, sy, size, size, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const formEl = e.currentTarget;

    startTransition(async () => {
      const result = await storeStudentAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Murid berhasil ditambahkan.');
        formEl.reset();
        setCapturedImage(null);
        setShowCamera(false);
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
      <div>
        <h3 className="font-extrabold text-slate-850 text-lg flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-600" />
          <span>Tambah Murid Baru</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          Daftarkan murid baru. Sistem akan otomatis membuat akun untuk orang tua.
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
        <div>
          <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Nama Lengkap Murid
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Contoh: Ahmad Fauzi"
          />
        </div>

        <div>
          <label htmlFor="student_id" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Nomor Induk Siswa Nasional (NISN)
          </label>
          <input
            id="student_id"
            name="student_id"
            type="text"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="NISN sebagai Username & Password Ortu"
          />
        </div>

        <div>
          <label htmlFor="parent_name" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Nama Lengkap Wali / Orang Tua
          </label>
          <input
            id="parent_name"
            name="parent_name"
            type="text"
            required
            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-xs font-semibold transition-all"
            placeholder="Contoh: Hendra Wijaya"
          />
        </div>

        {/* Face Biometric Enrollment Section */}
        <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Daftarkan Wajah Biometrik</span>
            <button
              type="button"
              onClick={() => {
                setShowCamera(!showCamera);
                setCapturedImage(null);
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{showCamera ? 'Batal' : 'Aktifkan Kamera'}</span>
            </button>
          </div>

          <input type="hidden" name="face_image" value={capturedImage || ''} />

          {showCamera && (
            <div className="space-y-3 animate-fade-in">
              {!capturedImage ? (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="w-[180px] aspect-square bg-slate-900 rounded-xl overflow-hidden relative border border-slate-200">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-2 border-2 border-indigo-500/50 border-dashed rounded-lg pointer-events-none"></div>
                  </div>
                  {cameraError ? (
                    <span className="text-[10px] text-red-650 font-bold">{cameraError}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={captureSnapshot}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Ambil Foto Wajah
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-[120px] aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">
                    <img src={capturedImage} alt="Captured preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCapturedImage(null)}
                      className="absolute bottom-1 right-1 p-1 bg-red-650 bg-red-600 hover:bg-red-750 text-white text-[9px] font-bold rounded-md cursor-pointer transition-all"
                    >
                      Ulang
                    </button>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Wajah Siap Disimpan
                  </span>
                </div>
              )}
            </div>
          )}
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
            <span>Simpan Data Murid</span>
          )}
        </button>
      </form>
    </div>
  );
}

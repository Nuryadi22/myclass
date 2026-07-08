'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { registerStudentFaceAction } from '@/app/actions/teacher';

interface BiometricEnrollButtonProps {
  studentId: string;
  studentName: string;
  isRegistered: boolean;
}

export default function BiometricEnrollButton({
  studentId,
  studentName,
  isRegistered,
}: BiometricEnrollButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  // Camera & Capture states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, aspectRatio: 1.0 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setCameraError('Gagal mengakses kamera. Harap izinkan akses kamera.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, capturedImage]);

  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const vid = videoRef.current;
        const size = Math.min(vid.videoWidth, vid.videoHeight);
        const sx = (vid.videoWidth - size) / 2;
        const sy = (vid.videoHeight - size) / 2;
        ctx.drawImage(vid, sx, sy, size, size, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const saveBiometric = () => {
    if (!capturedImage) return;

    startTransition(async () => {
      const res = await registerStudentFaceAction(studentId, capturedImage);
      if (res.success) {
        setStatusMsg({ type: 'success', text: 'Biometrik wajah berhasil didaftarkan.' });
        router.refresh();
        setTimeout(() => {
          setIsOpen(false);
          setCapturedImage(null);
          setStatusMsg(null);
        }, 1500);
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Gagal menyimpan wajah.' });
      }
    });
  };

  return (
    <>
      {/* Biometric Status Badge */}
      {isRegistered ? (
        <button
          onClick={() => {
            setIsOpen(true);
            setCapturedImage(null);
            setStatusMsg(null);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 text-xs font-bold rounded-full border border-emerald-100 transition-all cursor-pointer"
          title="Klik untuk re-registrasi wajah"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Terdaftar</span>
        </button>
      ) : (
        <button
          onClick={() => {
            setIsOpen(true);
            setCapturedImage(null);
            setStatusMsg(null);
          }}
          className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100/70 text-xs font-bold rounded-full border border-amber-100 transition-all cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-amber-600" />
          <span>Belum Ada</span>
        </button>
      )}

      {/* Floating Modal Camera Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-100 shadow-2xl p-6 relative flex flex-col space-y-6">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                setCapturedImage(null);
                setStatusMsg(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <div>
              <h3 className="font-extrabold text-slate-850 text-base leading-tight">Registrasi Wajah</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Daftarkan data biometrik untuk murid <span className="text-slate-800 font-bold">{studentName}</span>.
              </p>
            </div>

            {/* Notifications */}
            {statusMsg && (
              <div
                className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs border ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-red-50 border-red-100 text-red-800'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* Camera Box / Capture View */}
            <div className="flex flex-col items-center justify-center space-y-4">
              {!capturedImage ? (
                <>
                  <div className="w-64 aspect-square bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-205 shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    {/* Guides */}
                    <div className="absolute inset-4 border-2 border-indigo-500/50 border-dashed rounded-full pointer-events-none"></div>
                  </div>

                  {cameraError ? (
                    <span className="text-xs text-red-600 font-bold text-center">{cameraError}</span>
                  ) : (
                    <button
                      onClick={captureSnapshot}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-slate-100"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Foto Wajah
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="w-48 aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative shadow-sm">
                    <img src={capturedImage} alt="Captured face preview" className="w-full h-full object-cover" />
                    {!isPending && !statusMsg && (
                      <button
                        onClick={() => setCapturedImage(null)}
                        className="absolute bottom-2 right-2 px-2 py-1 bg-red-600 hover:bg-red-750 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                      >
                        Ulangi
                      </button>
                    )}
                  </div>

                  {!statusMsg && (
                    <button
                      onClick={saveBiometric}
                      disabled={isPending}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-50 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menyimpan Biometrik...</span>
                        </>
                      ) : (
                        <span>Simpan Data Biometrik</span>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}

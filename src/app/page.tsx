'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import { KeyRound, User, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(null, formData);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        // Redirect based on role
        if (result.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (result.role === 'teacher') {
          router.push('/teacher/dashboard');
        } else {
          router.push('/parent/dashboard');
        }
        router.refresh();
      }
    });
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-slate-50">
      {/* Left Panel: App Explanation (hidden on mobile, visible on md+) */}
      <div className="hidden md:flex md:w-1/2 bg-indigo-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative solid-colored abstract elements (no gradients) */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-800 rounded-full opacity-50"></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-950 rounded-full opacity-40"></div>

        <div className="relative z-10 space-y-8 my-auto max-w-lg">
          <div className="flex items-center gap-3">
            <img
              src="/logo-myclass.png"
              alt="MyClass Logo"
              className="w-12 h-12 object-contain select-none rounded-xl"
            />
            <span className="text-2xl font-extrabold tracking-tight">MyClass</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Platform Kolaborasi Guru & Wali Murid
            </h1>
            <p className="text-indigo-200 text-sm leading-relaxed">
              MyClass mempermudah pemantauan perkembangan akademis, keaktifan, kedisiplinan, hingga pembiasaan ibadah mandiri siswa di rumah dalam satu platform terintegrasi.
            </p>
          </div>

          {/* Feature list with clean cards */}
          {/* <div className="space-y-4 pt-4">
            <div className="flex gap-4 items-start bg-indigo-950/40 p-4 rounded-2xl border border-indigo-800/40">
              <div className="text-xl mt-0.5">⏱️</div>
              <div>
                <h4 className="font-bold text-sm text-white">Absensi QR & Kehadiran</h4>
                <p className="text-xs text-indigo-200 mt-0.5">Pencatatan kehadiran harian dengan scan QR code instan dan notifikasi otomatis ke orang tua.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-indigo-950/40 p-4 rounded-2xl border border-indigo-800/40">
              <div className="text-xl mt-0.5">⭐</div>
              <div>
                <h4 className="font-bold text-sm text-white">Poin Keaktifan & Prestasi</h4>
                <p className="text-xs text-indigo-200 mt-0.5">Penghargaan poin untuk keaktifan kelas, hafalan qur'an, serta portofolio karya siswa.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-indigo-950/40 p-4 rounded-2xl border border-indigo-800/40">
              <div className="text-xl mt-0.5">🕌</div>
              <div>
                <h4 className="font-bold text-sm text-white">Monitoring Ibadah Mandiri</h4>
                <p className="text-xs text-indigo-200 mt-0.5">Laporan pembiasaan ibadah mandiri harian di rumah langsung dari wali murid.</p>
              </div>
            </div>
          </div> */}
        </div>

        <div className="relative z-10 text-xs text-indigo-300 font-semibold">
          <p>© {new Date().getFullYear()} MyClass By NYD Monitoring System. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50 relative overflow-y-auto">
        {/* Decorative solid-colored blobs for right side (no gradients, just opacity/blur) */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-emerald-50 rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>

        <div className="w-full max-w-md space-y-8 z-10">
          {/* Mobile top header (hidden on desktop screens) */}
          <div className="md:hidden flex flex-col items-center">
            <img
              src="/logo-myclass.png"
              alt="MyClass Logo"
              className="w-16 h-16 object-contain rounded-2xl"
            />
            <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
              Selamat Datang di <span className="text-indigo-600">MyClass</span>
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500 font-semibold">
              Aplikasi Monitoring Kehadiran & Keaktifan Kelas
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-md py-8 px-8 shadow-xl border border-slate-100 rounded-3xl">
            {/* Desktop header title */}
            <div className="hidden md:block mb-6">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Portal Masuk</h2>
              <p className="text-slate-500 text-xs font-semibold mt-1">Silakan masuk menggunakan akun terdaftar Anda</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-800 rounded-xl flex items-start gap-3 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Gagal Masuk: </span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Nomor Induk / Username
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="block w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white text-sm font-semibold transition-all"
                    placeholder="NIG Guru / NISN Siswa / admin"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Kata Sandi (Password)
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="block w-full pl-10 pr-12 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white text-sm font-semibold transition-all"
                    placeholder="Masukkan password Anda"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded-lg cursor-pointer"
                  />
                  <label htmlFor="remember" className="ml-2 block text-xs font-bold text-slate-500 cursor-pointer select-none">
                    Ingat Saya
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-100 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Masuk Portal</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="text-center text-xs text-slate-400 font-semibold space-y-1">
            <p>© {new Date().getFullYear()} MyClass By NYD Monitoring System.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

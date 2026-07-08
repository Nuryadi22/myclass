'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Clock, Heart, BarChart3, PieChart } from 'lucide-react';
import Chart from 'chart.js/auto';
import FaceScanner from './FaceScanner';

interface Student {
  id: number;
  name: string;
  studentId: string;
}

interface Activity {
  id: number;
  type: string;
  title: string;
  pointsImpact: number;
  student: { name: string };
}

interface Creativity {
  id: number;
  title: string;
  imagePath: string;
  pointsAwarded: number;
  student: { name: string };
}

interface TeacherDashboardClientProps {
  students: Student[];
  topStudents: { name: string; totalPoints: number }[];
  attendanceStats: {
    present: number;
    late: number;
    sick: number;
    excused: number;
    absent: number;
  };
  recentActivities: Activity[];
  recentCreativities: Creativity[];
}

export default function TeacherDashboardClient({
  students,
  topStudents,
  attendanceStats,
  recentActivities,
  recentCreativities,
}: TeacherDashboardClientProps) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstance = useRef<Chart | null>(null);
  const pieChartInstance = useRef<Chart | null>(null);

  // Initialize Charts on mount/update
  useEffect(() => {
    // 1. Bar Chart: Leaderboard Poin Murid
    if (barChartRef.current) {
      const ctx = barChartRef.current.getContext('2d');
      if (ctx) {
        if (barChartInstance.current) {
          barChartInstance.current.destroy();
        }

        const labels = topStudents.map((s) => s.name);
        const data = topStudents.map((s) => s.totalPoints);

        barChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels.length > 0 ? labels : ['Belum Ada Data'],
            datasets: [
              {
                label: 'Poin Bintang',
                data: data.length > 0 ? data : [0],
                backgroundColor: 'rgba(99, 102, 241, 0.75)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 1,
                borderRadius: 8,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9' },
                ticks: { font: { weight: 'bold', size: 10 } },
              },
              x: {
                grid: { display: false },
                ticks: { font: { weight: 'bold', size: 9 } },
              },
            },
          },
        });
      }
    }

    // 2. Pie Chart: Statistik Kehadiran Hari Ini
    if (pieChartRef.current) {
      const ctx = pieChartRef.current.getContext('2d');
      if (ctx) {
        if (pieChartInstance.current) {
          pieChartInstance.current.destroy();
        }

        const totalAtt =
          attendanceStats.present +
          attendanceStats.late +
          attendanceStats.sick +
          attendanceStats.excused +
          attendanceStats.absent;

        const hasData = totalAtt > 0;

        pieChartInstance.current = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: hasData
              ? ['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alfa']
              : ['Belum Ada Absensi'],
            datasets: [
              {
                data: hasData
                  ? [
                      attendanceStats.present,
                      attendanceStats.late,
                      attendanceStats.sick,
                      attendanceStats.excused,
                      attendanceStats.absent,
                    ]
                  : [1],
                backgroundColor: hasData
                  ? [
                      'rgb(16, 185, 129)', // Present: Emerald
                      'rgb(245, 158, 11)',  // Late: Amber
                      'rgb(59, 130, 246)',  // Sick: Blue
                      'rgb(99, 102, 241)',  // Excused: Indigo
                      'rgb(239, 68, 68)',   // Absent: Red
                    ]
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
                position: 'right',
                labels: {
                  boxWidth: 10,
                  font: { weight: 'bold', size: 10 },
                  padding: 8,
                },
              },
            },
          },
        });
      }
    }

    return () => {
      if (barChartInstance.current) barChartInstance.current.destroy();
      if (pieChartInstance.current) pieChartInstance.current.destroy();
    };
  }, [topStudents, attendanceStats]);

  return (
    <div className="space-y-8">
      {/* Scanner Action Trigger Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-indigo-950/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.1),transparent_70%)] pointer-events-none"></div>
        <div className="space-y-2 relative z-10 text-center md:text-left">
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-350 border border-indigo-400/20 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">
            Sistem Absensi Terpadu
          </span>
          <h3 className="text-xl md:text-2xl font-black text-white leading-tight">Mulai Rekam Kehadiran Kelas</h3>
          <p className="text-slate-300 text-xs font-medium max-w-lg leading-relaxed">
            Gunakan kamera untuk pencatatan otomatis menggunakan pemindai wajah (biometrik), scan kartu QR Code, atau masukkan data absensi secara manual.
          </p>
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="relative z-10 px-6 py-3.5 bg-white text-indigo-900 hover:bg-slate-50 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-103 active:scale-98 transition-all shrink-0"
        >
          <Camera className="w-4 h-4 text-indigo-700 animate-pulse" />
          <span>Buka Pemindai Absensi</span>
        </button>
      </div>

      {/* Analytics Charts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart: Leaderboard Bintang */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <div>
              <h4 className="font-extrabold text-slate-850 text-base leading-tight">Peringkat Poin Teratas</h4>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Top 7 murid berdasarkan akumulasi poin bintang kelas.</p>
            </div>
          </div>
          <div className="relative h-64 w-full">
            <canvas ref={barChartRef} id="dashboard-bar-chart"></canvas>
          </div>
        </div>

        {/* Pie Chart: Persentase Kehadiran */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            <div>
              <h4 className="font-extrabold text-slate-850 text-base leading-tight">Statistik Kehadiran Hari Ini</h4>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Rasio sebaran kehadiran seluruh murid kelas hari ini.</p>
            </div>
          </div>
          <div className="relative h-64 w-full flex items-center justify-center">
            <canvas ref={pieChartRef} id="dashboard-pie-chart"></canvas>
          </div>
        </div>
      </div>

      {/* Feed Cards: Activities and Creativities (placed below charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Recent Activities Feed */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
          <div>
            <h4 className="font-extrabold text-slate-855 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>Aktivitas Keaktifan Terbaru</span>
            </h4>
            <p className="text-xs text-slate-400 font-semibold mt-1">Log pencatatan aktivitas akademik murid kelas.</p>
          </div>

          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-450 text-center py-8">Belum ada aktivitas keaktifan yang dicatat.</p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100/50 rounded-2xl text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">
                      {act.type === 'memorization' ? '🕌' : act.type === 'literacy' ? '📚' : act.type === 'numeracy' ? '🔢' : act.type === 'punishment' ? '⚠️' : '💡'}
                    </span>
                    <div>
                      <span className="font-extrabold text-slate-800 block leading-tight">{act.student.name}</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">{act.type}: {act.title}</span>
                    </div>
                  </div>
                  <span className={`font-extrabold text-sm ${act.pointsImpact > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {act.pointsImpact > 0 ? `+${act.pointsImpact}` : act.pointsImpact}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Portfolios / Creativities */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
          <div>
            <h4 className="font-extrabold text-slate-850 text-base flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <span>Karya Kreativitas Terbaru</span>
            </h4>
            <p className="text-xs text-slate-400 font-semibold mt-1">Unggahan karya kreativitas kerajinan tangan / seni murid terbaru.</p>
          </div>

          <div className="space-y-3">
            {recentCreativities.length === 0 ? (
              <p className="text-xs text-slate-450 text-center py-8">Belum ada karya kreativitas yang diunggah.</p>
            ) : (
              recentCreativities.map((cr) => (
                <div key={cr.id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100/50 rounded-2xl text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 border border-slate-100 flex-shrink-0">
                      <img src={`/${cr.imagePath}`} alt={cr.title} className="object-cover w-full h-full" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-800 block leading-tight">{cr.student.name}</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">{cr.title}</span>
                    </div>
                  </div>
                  <span className="font-extrabold text-emerald-600 text-sm">+{cr.pointsAwarded} Poin</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-100 shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setIsScannerOpen(false);
                // Force a page refresh to get updated dashboard stats on close
                window.location.reload();
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-xl transition-all cursor-pointer z-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="mb-4">
              <h3 className="font-extrabold text-slate-850 text-base leading-tight">Pemindai Absensi Kelas</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Lakukan pemindaian wajah biometrik, scan QR Code, atau isi absensi manual secara real-time.
              </p>
            </div>

            {/* Modal Body Container with Scroll */}
            <div className="overflow-y-auto pr-1 flex-1">
              <FaceScanner students={students} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

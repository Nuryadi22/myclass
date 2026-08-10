'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Bell, CheckCircle, Clock, AlertCircle, XCircle, HeartPulse } from 'lucide-react';

interface AttendanceInfo {
  id: number;
  time: string;
  status: string;
  updatedAt: string;
}

interface ChildAttendance {
  studentId: number;
  studentName: string;
  attendance: AttendanceInfo | null;
}

const POLL_INTERVAL = 30000; // 30 seconds

function getStatusConfig(status: string) {
  switch (status) {
    case 'present':
    case 'late':
      return {
        label: 'Hadir',
        icon: CheckCircle,
        bg: 'from-emerald-500 to-teal-500',
        lightBg: 'bg-emerald-50 border-emerald-100',
        textColor: 'text-emerald-800',
        badgeBg: 'bg-emerald-100',
        emoji: '✅',
      };
    case 'sick':
      return {
        label: 'Sakit',
        icon: HeartPulse,
        bg: 'from-blue-500 to-sky-500',
        lightBg: 'bg-blue-50 border-blue-100',
        textColor: 'text-blue-800',
        badgeBg: 'bg-blue-100',
        emoji: '🤒',
      };
    case 'excused':
      return {
        label: 'Izin',
        icon: Clock,
        bg: 'from-indigo-500 to-violet-500',
        lightBg: 'bg-indigo-50 border-indigo-100',
        textColor: 'text-indigo-800',
        badgeBg: 'bg-indigo-100',
        emoji: '✉️',
      };
    case 'absent':
      return {
        label: 'Alfa',
        icon: XCircle,
        bg: 'from-red-500 to-rose-500',
        lightBg: 'bg-red-50 border-red-100',
        textColor: 'text-red-800',
        badgeBg: 'bg-red-100',
        emoji: '❌',
      };
    default:
      return {
        label: 'Belum Diabsen',
        icon: AlertCircle,
        bg: 'from-slate-400 to-slate-500',
        lightBg: 'bg-slate-50 border-slate-100',
        textColor: 'text-slate-600',
        badgeBg: 'bg-slate-100',
        emoji: '⏳',
      };
  }
}

export default function RealtimeAttendanceAlert() {
  const [isOpen, setIsOpen] = useState(false);
  const [alertData, setAlertData] = useState<ChildAttendance[]>([]);
  const prevDataRef = useRef<Record<number, string | null>>({});
  const isFirstFetch = useRef(true);

  const checkAttendance = useCallback(async () => {
    try {
      const res = await fetch('/api/parent/attendance-today', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const children: ChildAttendance[] = data.children || [];

      // Detect changes (new or updated attendance)
      let hasChange = false;
      const newPrev: Record<number, string | null> = {};

      for (const child of children) {
        const prevKey = prevDataRef.current[child.studentId] ?? null;
        const currKey = child.attendance
          ? `${child.attendance.id}_${child.attendance.updatedAt}`
          : null;
        newPrev[child.studentId] = currKey;

        if (!isFirstFetch.current && prevKey !== currKey) {
          hasChange = true;
        }
      }

      prevDataRef.current = newPrev;

      if (isFirstFetch.current) {
        isFirstFetch.current = false;
        return;
      }

      if (hasChange) {
        // Show modal with updated data
        const changedChildren = children.filter((child) => {
          return child.attendance !== null;
        });
        if (changedChildren.length > 0) {
          setAlertData(changedChildren);
          setIsOpen(true);
        }
      }
    } catch (err) {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    checkAttendance();
    const interval = setInterval(checkAttendance, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkAttendance]);

  if (!isOpen || alertData.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 z-10 overflow-hidden animate-slide-in">
        {/* Gradient top bar */}
        <div className={`h-2 bg-gradient-to-r ${alertData[0]?.attendance ? getStatusConfig(alertData[0].attendance.status).bg : 'from-emerald-500 to-teal-500'}`} />

        <div className="p-6 space-y-5">
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon & Title */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-3xl mx-auto shadow-sm">
              📢
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Update Presensi!</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
          </div>

          {/* Children attendance cards */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {alertData.map((child) => {
              const att = child.attendance;
              if (!att) return null;
              const cfg = getStatusConfig(att.status);
              const Icon = cfg.icon;
              return (
                <div
                  key={child.studentId}
                  className={`p-4 rounded-2xl border ${cfg.lightBg} space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-sm font-extrabold text-slate-700 shadow-xs">
                        {child.studentName.substring(0, 2).toUpperCase()}
                      </div>
                      <p className="text-xs font-extrabold text-slate-800">{child.studentName}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${cfg.badgeBg} ${cfg.textColor}`}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  </div>
                  <p className={`text-[11px] font-semibold ${cfg.textColor} leading-relaxed`}>
                    {att.status === 'present' || att.status === 'late'
                      ? `Alhamdulillah, telah dipresensi hadir pada pukul ${att.time.substring(0, 5)} WIB.`
                      : att.status === 'sick'
                      ? `Tercatat sakit pada pukul ${att.time.substring(0, 5)} WIB. Semoga cepat sembuh! 🙏`
                      : att.status === 'excused'
                      ? `Tercatat izin pada pukul ${att.time.substring(0, 5)} WIB.`
                      : `Tercatat alfa / tidak hadir tanpa keterangan pada pukul ${att.time.substring(0, 5)} WIB.`}
                  </p>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-100 transition-all cursor-pointer"
          >
            Oke, Terima Kasih 🙏
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { X, AlertCircle, Info, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isPending?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  type = 'info',
  isPending = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  // Design tokens based on type
  const theme = {
    danger: {
      bgIcon: 'bg-red-50 text-red-650 text-red-600',
      icon: <AlertCircle className="w-8 h-8 text-red-600" />,
      btnConfirm: 'bg-red-600 hover:bg-red-700 shadow-red-100 focus:ring-red-500',
    },
    warning: {
      bgIcon: 'bg-amber-50 text-amber-600',
      icon: <AlertCircle className="w-8 h-8 text-amber-600" />,
      btnConfirm: 'bg-amber-600 hover:bg-amber-700 shadow-amber-100 focus:ring-amber-500',
    },
    info: {
      bgIcon: 'bg-indigo-50 text-indigo-600',
      icon: <Info className="w-8 h-8 text-indigo-600" />,
      btnConfirm: 'bg-slate-800 hover:bg-slate-900 shadow-slate-100 focus:ring-slate-700',
    },
  }[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with fade-in and backdrop-blur */}
      <div
        onClick={isPending ? undefined : onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
      ></div>

      {/* Modal Card with slide-in and scale animation */}
      <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 overflow-hidden shadow-2xl border border-slate-100 z-50 text-center space-y-5 animate-slide-in">
        {/* Close Button */}
        {!isPending && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1 bg-slate-50 rounded-full cursor-pointer hover:scale-105 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Icon wrapper */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md select-none ${theme.bgIcon}`}>
          {theme.icon}
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h3 className="text-base font-extrabold text-slate-800 leading-tight">{title}</h3>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed whitespace-pre-line">{message}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${theme.btnConfirm}`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

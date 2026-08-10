'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const [isMounted, setIsMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    setPermission(Notification.permission);

    navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      setSwReady(true);
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        setIsSubscribed(true);
      }
    }).catch(console.error);
  }, []);

  const handleSubscribe = async () => {
    if (!swReady) return;
    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error('Subscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Unsubscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if not supported or during SSR
  if (!isMounted) return null;
  if (!('serviceWorker' in window.navigator) || !('PushManager' in window)) return null;

  const isPermanentlyDenied = permission === 'denied';

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (isPermanentlyDenied) {
            setShowTooltip(!showTooltip);
            return;
          }
          isSubscribed ? handleUnsubscribe() : handleSubscribe();
        }}
        disabled={isLoading}
        title={
          isPermanentlyDenied
            ? 'Notifikasi diblokir browser. Aktifkan di pengaturan browser Anda.'
            : isSubscribed
            ? 'Matikan notifikasi push'
            : 'Aktifkan notifikasi push ke perangkat ini'
        }
        className={`relative p-2 rounded-lg transition-all cursor-pointer ${
          isLoading
            ? 'opacity-50 cursor-wait'
            : isPermanentlyDenied
            ? 'text-slate-300 bg-slate-50'
            : isSubscribed
            ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        {isLoading ? (
          <BellRing className="w-5 h-5 animate-pulse" />
        ) : isPermanentlyDenied ? (
          <BellOff className="w-5 h-5" />
        ) : isSubscribed ? (
          <>
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 border border-white animate-pulse" />
          </>
        ) : (
          <Bell className="w-5 h-5" />
        )}
      </button>

      {/* Tooltip for blocked permission */}
      {showTooltip && isPermanentlyDenied && (
        <div className="absolute right-0 top-12 w-56 bg-slate-800 text-white text-[11px] rounded-xl p-3 shadow-lg z-50 font-semibold leading-relaxed">
          Notifikasi diblokir oleh browser. Buka pengaturan browser → izinkan notifikasi untuk situs ini.
          <button
            onClick={() => setShowTooltip(false)}
            className="block mt-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function doSubscribe() {
  const reg = await navigator.serviceWorker.register('/sw.js');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? (await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  }));

  const json = sub.toJSON();
  await api.post('/notifications/push-subscribe', {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
    userAgent: navigator.userAgent,
  });
  return true;
}

/**
 * Web Push 구독 훅.
 * - needsBanner: true → 알림 허용 배너 표시 필요
 * - requestPermission(): 버튼 클릭 시 호출 (user gesture 필요)
 */
export function usePushSubscription(enabled: boolean) {
  // 'default' = 아직 결정 안 함, 'granted' = 허용, 'denied' = 거부
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (!enabled || !VAPID_PUBLIC_KEY) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const current = Notification.permission;
    setPermission(current);

    // 이미 허용된 경우 자동으로 구독 등록 (권한 팝업 없음)
    if (current === 'granted') {
      doSubscribe().catch(() => {});
    }
  }, [enabled]);

  const requestPermission = useCallback(async () => {
    try {
      const granted = await doSubscribe();
      setPermission(granted ? 'granted' : 'denied');
      return granted;
    } catch {
      return false;
    }
  }, []);

  const needsBanner =
    enabled &&
    !!VAPID_PUBLIC_KEY &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    permission === 'default';

  return { needsBanner, requestPermission };
}

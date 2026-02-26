'use client';

import { useEffect } from 'react';
import { useSystemSettings, settingsToMap } from './use-system-settings';
import {
  setNotificationConfig,
  DEFAULT_CONFIG,
  type ProcessNotificationConfig,
} from '@/lib/process-notify';

/**
 * 알림 설정을 SystemSettings에서 로드하여 메모리에 캐시한다.
 * 대시보드 레이아웃에서 1회 호출하면 전체 관리자 화면에서 적용된다.
 */
export function useNotificationConfig() {
  const { data: settings } = useSystemSettings('notification');

  useEffect(() => {
    if (!settings) return;
    const map = settingsToMap(settings);
    const raw = map['notification_process_config'];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<ProcessNotificationConfig>;
        setNotificationConfig({ ...DEFAULT_CONFIG, ...parsed });
      } catch {
        setNotificationConfig(DEFAULT_CONFIG);
      }
    } else {
      setNotificationConfig(DEFAULT_CONFIG);
    }
  }, [settings]);
}

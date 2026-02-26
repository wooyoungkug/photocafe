// ---------------------------------------------------------------------------
// 공정별 알림 시스템 (TTS 음성 / 비프음 / 끄기)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotifyMode = 'tts' | 'beep' | 'off';

export interface ProcessNotificationConfig {
  globalEnabled: boolean;
  defaultMode: NotifyMode;
  beepSettings: {
    frequency: number;
    duration: number;
    volume: number;
  };
  ttsSettings: {
    rate: number;
    lang: string;
  };
  points: Record<string, {
    mode: NotifyMode;
    customMessage?: string;
  }>;
}

// ---------------------------------------------------------------------------
// 알림 지점 정의 (20개)
// ---------------------------------------------------------------------------

export const NOTIFICATION_POINTS = {
  // 바코드 스캐너 파이프라인
  scanner_logen_issue: { label: '송장 발급 중', defaultMessage: '송장 발급 중', category: 'scanner' },
  scanner_logen_existing: { label: '기존 송장번호 사용', defaultMessage: '기존 송장번호 사용', category: 'scanner' },
  scanner_logen_complete: { label: '송장 발급 완료', defaultMessage: '송장 발급 완료', category: 'scanner' },
  scanner_label_generating: { label: '라벨 생성 중', defaultMessage: '라벨 생성 중', category: 'scanner' },
  scanner_printing: { label: '출력 중', defaultMessage: '출력 중', category: 'scanner' },
  scanner_print_complete: { label: '출력 완료', defaultMessage: '출력 완료', category: 'scanner' },
  scanner_not_found: { label: '주문 없음', defaultMessage: '주문을 찾을 수 없습니다', category: 'scanner' },
  scanner_error: { label: '스캔 오류', defaultMessage: '자동 처리 실패', category: 'scanner' },

  // 배송관리 페이지
  shipping_print_complete: { label: '송장 출력 완료', defaultMessage: '송장 출력 완료', category: 'shipping' },
  shipping_download_complete: { label: '송장 다운로드 완료', defaultMessage: '송장 다운로드 완료', category: 'shipping' },
  shipping_print_fail: { label: '송장 출력 실패', defaultMessage: '송장 출력 실패', category: 'shipping' },
  shipping_address_missing_recipient: { label: '수령인 주소 누락', defaultMessage: '수령인 주소가 누락되었습니다', category: 'shipping' },
  shipping_address_missing_sender: { label: '발송인 주소 누락', defaultMessage: '발송인 주소가 누락되었습니다', category: 'shipping' },
  shipping_existing_tracking: { label: '기존 송장', defaultMessage: '이미 송장번호가 있습니다', category: 'shipping' },
  shipping_auto_complete: { label: '자동발급 완료', defaultMessage: '송장 자동발급 완료', category: 'shipping' },
  shipping_auto_fail: { label: '자동발급 실패', defaultMessage: '송장 발급 실패', category: 'shipping' },
  shipping_bulk_complete: { label: '일괄 발급 완료', defaultMessage: '송장 일괄 발급 완료', category: 'shipping' },
  shipping_bulk_fail: { label: '일괄 발급 실패', defaultMessage: '일괄 발급 실패', category: 'shipping' },

  // 송장 입력 다이얼로그
  tracking_save_complete: { label: '송장 저장완료', defaultMessage: '운송장 저장완료', category: 'tracking' },
} as const;

export type NotificationPointKey = keyof typeof NOTIFICATION_POINTS;

export const NOTIFICATION_CATEGORIES = {
  scanner: '바코드 스캐너',
  shipping: '배송관리',
  tracking: '송장 입력',
} as const;

export type NotificationCategoryKey = keyof typeof NOTIFICATION_CATEGORIES;

// ---------------------------------------------------------------------------
// 기본 설정
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: ProcessNotificationConfig = {
  globalEnabled: true,
  defaultMode: 'tts',
  beepSettings: { frequency: 800, duration: 200, volume: 0.5 },
  ttsSettings: { rate: 1.1, lang: 'ko-KR' },
  points: {},
};

// ---------------------------------------------------------------------------
// 설정 캐시 (메모리)
// ---------------------------------------------------------------------------

let cachedConfig: ProcessNotificationConfig | null = null;

export function setNotificationConfig(config: ProcessNotificationConfig): void {
  cachedConfig = config;
}

export function getNotificationConfig(): ProcessNotificationConfig {
  return cachedConfig ?? DEFAULT_CONFIG;
}

// ---------------------------------------------------------------------------
// 비프음 (AudioContext)
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

export function playBeep(
  frequency = 800,
  duration = 200,
  volume = 0.5,
): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch {
    // AudioContext not available
  }
}

// ---------------------------------------------------------------------------
// TTS 음성
// ---------------------------------------------------------------------------

function speakTTS(text: string, rate = 1.1, lang = 'ko-KR'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  // Chrome: cancel() 직후 speak()가 무시되는 버그 우회 (인쇄 대화상자 후 특히 발생)
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }, 100);
}

// ---------------------------------------------------------------------------
// 메인 함수: processNotify()
// ---------------------------------------------------------------------------

/**
 * 중앙 알림 함수. 설정에 따라 TTS 음성 또는 비프음을 재생한다.
 * @param key - 알림 지점 키
 * @param dynamicMessage - 동적 메시지 (에러 메시지, 건수 등)
 */
export function processNotify(
  key: NotificationPointKey,
  dynamicMessage?: string,
): void {
  const config = getNotificationConfig();

  if (!config.globalEnabled) return;

  const pointOverride = config.points[key];
  const mode: NotifyMode = pointOverride?.mode ?? config.defaultMode;

  if (mode === 'off') return;

  if (mode === 'beep') {
    playBeep(
      config.beepSettings.frequency,
      config.beepSettings.duration,
      config.beepSettings.volume,
    );
    return;
  }

  // mode === 'tts'
  const pointDef = NOTIFICATION_POINTS[key];
  const message = dynamicMessage ?? pointOverride?.customMessage ?? pointDef.defaultMessage;
  speakTTS(message, config.ttsSettings.rate, config.ttsSettings.lang);
}

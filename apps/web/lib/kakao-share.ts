/**
 * 카카오톡 공유 유틸리티
 * - Kakao JavaScript SDK를 사용하여 카카오톡 링크 공유
 * - .env에 NEXT_PUBLIC_KAKAO_JS_KEY 설정 필요
 */

declare global {
  interface Window {
    Kakao?: {
      init: (appKey: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (params: any) => void;
      };
    };
  }
}

let sdkLoaded = false;

/** Kakao SDK 스크립트 로드 */
export function loadKakaoSDK(): Promise<void> {
  if (sdkLoaded && window.Kakao) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (document.getElementById('kakao-sdk')) {
      sdkLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-sdk';
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    script.integrity = 'sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Ber6ja';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      sdkLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Kakao SDK 로드 실패'));
    document.head.appendChild(script);
  });
}

/** Kakao SDK 초기화 */
export function initKakao(): boolean {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!appKey || !window.Kakao) return false;

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(appKey);
  }
  return window.Kakao.isInitialized();
}

/** 카카오톡 공유 - 거래내역서 링크 공유 */
export async function shareStatementViaKakao(params: {
  clientName: string;
  statementType: string;
  startDate: string;
  endDate: string;
  closingBalance: number;
  statementUrl: string;
}) {
  await loadKakaoSDK();
  const initialized = initKakao();
  if (!initialized) {
    throw new Error('카카오톡 공유를 사용하려면 NEXT_PUBLIC_KAKAO_JS_KEY를 설정하세요.');
  }

  const typeLabels: Record<string, string> = {
    detail: '세부 거래내역서',
    daily: '일별 거래내역서',
    monthly: '월별 거래내역서',
    period: '기간별 거래내역서',
  };

  const title = `${params.clientName} ${typeLabels[params.statementType] || '거래내역서'}`;
  const description = `기간: ${params.startDate} ~ ${params.endDate}\n기말 잔액: ${Math.round(params.closingBalance).toLocaleString()}원`;

  window.Kakao!.Share.sendDefault({
    objectType: 'feed',
    content: {
      title,
      description,
      imageUrl: '', // 필요시 회사 로고 URL
      link: {
        mobileWebUrl: params.statementUrl,
        webUrl: params.statementUrl,
      },
    },
    buttons: [
      {
        title: '거래내역서 확인',
        link: {
          mobileWebUrl: params.statementUrl,
          webUrl: params.statementUrl,
        },
      },
    ],
  });
}

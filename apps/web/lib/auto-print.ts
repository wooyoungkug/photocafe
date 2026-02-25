const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export interface AutoPrintOptions {
  orderId: string;
  onPrintStart?: () => void;
  onPrintEnd?: () => void;
  onError?: (error: Error) => void;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
}

/**
 * 라벨 PDF를 hidden iframe에 로드하여 자동 출력
 *
 * 1. Bearer 토큰으로 /delivery/label/view/:orderId fetch → blob
 * 2. blob URL → hidden iframe src
 * 3. iframe load → contentWindow.print()
 * 4. afterprint → cleanup
 */
export function autoPrintLabel(options: AutoPrintOptions): () => void {
  const { orderId, onPrintStart, onPrintEnd, onError } = options;

  let cancelled = false;
  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:none;';
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  };

  (async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/delivery/label/view/${orderId}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('라벨 PDF 로드 실패');
      }
      if (cancelled) {
        cleanup();
        return;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      iframe.onload = () => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          cleanup();
          return;
        }

        try {
          onPrintStart?.();
          iframe.contentWindow?.print();
        } catch (e) {
          URL.revokeObjectURL(blobUrl);
          cleanup();
          onError?.(e instanceof Error ? e : new Error('출력 실패'));
          return;
        }

        // afterprint 이벤트로 cleanup
        const handleAfterPrint = () => {
          URL.revokeObjectURL(blobUrl);
          cleanup();
          onPrintEnd?.();
        };
        iframe.contentWindow?.addEventListener('afterprint', handleAfterPrint);

        // 60초 fallback timeout
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          cleanup();
        }, 60000);
      };

      iframe.src = blobUrl;
    } catch (err) {
      cleanup();
      onError?.(err instanceof Error ? err : new Error('출력 처리 중 오류'));
    }
  })();

  // 취소 함수 반환
  return () => {
    cancelled = true;
    cleanup();
  };
}

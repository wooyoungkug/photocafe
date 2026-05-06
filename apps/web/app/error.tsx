'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-red-600 mb-4">오류가 발생했습니다</h2>
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-sm text-red-800 font-mono break-all">
            {isDev ? (error.message || '알 수 없는 오류') : '요청을 처리하는 중 오류가 발생했습니다.'}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 mt-2">오류 코드: {error.digest}</p>
          )}
        </div>
        {/* 개발 환경에서만 스택 트레이스 표시 — 운영 환경 노출 시 내부 경로·코드 구조 유출 위험 */}
        {isDev && error.stack && (
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48 mb-4">
            {error.stack}
          </pre>
        )}
        <button
          onClick={() => reset()}
          className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}

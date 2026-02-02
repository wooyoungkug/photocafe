'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Shop Error:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h2>
        <p className="text-gray-600 mb-4">
          페이지를 불러오는 중 문제가 발생했습니다.
        </p>
        {error.message && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-red-800 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 mt-2">Error ID: {error.digest}</p>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => reset()}
            className="flex-1 gap-2"
            variant="default"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </Button>
          <Button
            onClick={() => router.push('/')}
            className="flex-1 gap-2"
            variant="outline"
          >
            <Home className="w-4 h-4" />
            홈으로
          </Button>
        </div>
      </div>
    </div>
  );
}

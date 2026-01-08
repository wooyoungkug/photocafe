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
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <h2 className="text-xl font-bold mb-4 text-red-600">오류가 발생했습니다</h2>
      <p className="mb-4 text-gray-600">{error.message}</p>
      <pre className="mb-4 p-4 bg-gray-100 rounded text-sm max-w-full overflow-auto">
        {error.stack}
      </pre>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => reset()}
      >
        다시 시도
      </button>
    </div>
  );
}

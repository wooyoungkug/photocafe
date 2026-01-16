'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = true }: AuthGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthorized' | 'redirecting'>('loading');

  useEffect(() => {
    try {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setStatus('redirecting');
        router.replace('/login');
        return;
      }

      if (requireAdmin) {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          const userRole = parsed?.state?.user?.role;

          if (userRole !== 'admin') {
            setStatus('unauthorized');
            return;
          }
        }
      }

      setStatus('authenticated');
    } catch (error) {
      console.error('AuthGuard error:', error);
      setStatus('redirecting');
      router.replace('/login');
    }
  }, [router, requireAdmin]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">X</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6">Admin only page</p>
          <button
            onClick={() => router.replace('/')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
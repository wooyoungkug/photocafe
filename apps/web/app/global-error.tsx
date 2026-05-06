'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Global Error:', error);
    }, [error]);

    const isDev = process.env.NODE_ENV === 'development';

    return (
        <html>
            <body style={{ margin: 0, padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#dc2626' }}>오류가 발생했습니다</h2>
                    <p style={{ marginBottom: '16px', color: '#4b5563' }}>
                        {isDev ? error.message : '서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'}
                    </p>
                    {error.digest && (
                        <p style={{ marginBottom: '8px', color: '#9ca3af', fontSize: '12px' }}>오류 코드: {error.digest}</p>
                    )}
                    {/* 개발 환경에서만 스택 트레이스 표시 — 운영 환경 노출 시 내부 경로·코드 구조 유출 위험 */}
                    {isDev && error.stack && (
                        <pre style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px', fontSize: '12px', maxWidth: '100%', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                            {error.stack}
                        </pre>
                    )}
                    <button
                        style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => reset()}
                    >
                        다시 시도
                    </button>
                </div>
            </body>
        </html>
    );
}

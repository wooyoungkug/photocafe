'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { ReviewForm, type ReviewFormData } from '@/components/shooting/review-form';
import { api } from '@/lib/api';

// ==================== 타입 ====================

interface ReviewShootingInfo {
  id: string;
  title: string;
  photographerName: string;
  scheduledDate: string;
  location?: string;
  isCompleted: boolean; // 이미 리뷰 완료 여부
}

type PageState = 'loading' | 'form' | 'submitted' | 'already_done' | 'error' | 'expired';

// ==================== 페이지 ====================

export default function PublicReviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [shootingInfo, setShootingInfo] = useState<ReviewShootingInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 토큰으로 촬영 정보 조회
  useEffect(() => {
    if (!token) return;

    const fetchShootingInfo = async () => {
      try {
        const response = await api.get<ReviewShootingInfo>(
          `/shootings/review/${token}`
        );
        setShootingInfo(response);

        if (response.isCompleted) {
          setPageState('already_done');
        } else {
          setPageState('form');
        }
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string };
        if (error?.status === 404 || error?.status === 410) {
          setPageState('expired');
          setErrorMessage('유효하지 않거나 만료된 링크입니다.');
        } else {
          setPageState('error');
          setErrorMessage('정보를 불러오는 중 오류가 발생했습니다.');
        }
      }
    };

    fetchShootingInfo();
  }, [token]);

  // 리뷰 제출
  const handleSubmit = useCallback(
    async (data: ReviewFormData) => {
      if (!token) return;

      setIsSubmitting(true);
      try {
        await api.post(`/shootings/review/${token}`, data);
        setPageState('submitted');
      } catch {
        setErrorMessage('리뷰를 제출하는 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [token]
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Camera className="h-5 w-5 text-gray-700" />
          <span className="text-[18px] text-black font-bold">촬영 평가</span>
        </div>
      </header>

      {/* 컨텐츠 */}
      <main className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto">
          {/* 로딩 */}
          {pageState === 'loading' && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-gray-400 mb-3" />
              <p className="text-[14px] text-gray-500">정보를 불러오고 있습니다...</p>
            </div>
          )}

          {/* 폼 */}
          {pageState === 'form' && shootingInfo && (
            <ReviewForm
              shootingTitle={shootingInfo.title}
              photographerName={shootingInfo.photographerName}
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
            />
          )}

          {/* 제출 완료 */}
          {pageState === 'submitted' && (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-[24px] text-black font-normal mb-2">감사합니다!</h2>
                <p className="text-[14px] text-gray-600">
                  소중한 평가를 남겨주셔서 감사합니다.
                </p>
                <p className="text-[14px] text-gray-600 mt-1">
                  보내주신 의견은 서비스 개선에 적극 반영하겠습니다.
                </p>
              </CardContent>
            </Card>
          )}

          {/* 이미 완료 */}
          {pageState === 'already_done' && (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h2 className="text-[24px] text-black font-normal mb-2">
                  이미 평가가 완료되었습니다
                </h2>
                <p className="text-[14px] text-gray-600">
                  해당 촬영에 대한 평가를 이미 제출하셨습니다.
                </p>
                <p className="text-[14px] text-gray-600 mt-1">참여해 주셔서 감사합니다.</p>
              </CardContent>
            </Card>
          )}

          {/* 만료/무효 링크 */}
          {pageState === 'expired' && (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-[24px] text-black font-normal mb-2">링크 만료</h2>
                <p className="text-[14px] text-gray-600">{errorMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* 에러 */}
          {pageState === 'error' && (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-16 w-16 text-red-300 mx-auto mb-4" />
                <h2 className="text-[24px] text-black font-normal mb-2">오류 발생</h2>
                <p className="text-[14px] text-gray-600">{errorMessage}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* 푸터 */}
      <footer className="py-4 px-4 text-center border-t bg-white">
        <p className="text-[12px] text-gray-400">Powered by Printing114</p>
      </footer>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Camera,
  CheckCircle,
  Loader2,
  AlertCircle,
  Heart,
  Star,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ReviewInfo {
  id: string;
  isCompleted: boolean;
  bid: {
    bidder: {
      clientName: string;
      profileImage?: string;
    };
    recruitment: {
      title: string;
      shootingType: string;
      shootingDate: string;
      venueName: string;
      customerName?: string;
    };
  };
}

type PageState = 'loading' | 'form' | 'submitted' | 'already_done' | 'expired' | 'error';

const SHOOTING_TYPE_LABELS: Record<string, string> = {
  wedding_main: '본식 촬영',
  wedding_rehearsal: '리허설 촬영',
  baby_dol: '돌 촬영',
  baby_growth: '성장 촬영',
  profile: '프로필 촬영',
  other: '기타 촬영',
};

export default function BidReviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [info, setInfo] = useState<ReviewInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 상태
  const [liked, setLiked] = useState(true);
  const [rating, setRating] = useState<number>(5);
  const [reviewerName, setReviewerName] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await api.get<ReviewInfo>(`/bid-reviews/${token}`);
        setInfo(res);
        setPageState(res.isCompleted ? 'already_done' : 'form');
      } catch (err: any) {
        if (err?.status === 404) {
          setPageState('expired');
          setErrorMsg('유효하지 않거나 만료된 링크입니다.');
        } else {
          setPageState('error');
          setErrorMsg('정보를 불러오지 못했습니다.');
        }
      }
    };
    load();
  }, [token]);

  const handleSubmit = useCallback(async () => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await api.post(`/bid-reviews/${token}`, {
        liked,
        rating,
        reviewerName: reviewerName.trim() || undefined,
        comment: comment.trim() || undefined,
      });
      setPageState('submitted');
    } catch (err: any) {
      setErrorMsg(err?.message || '제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }, [token, liked, rating, reviewerName, comment]);

  // ---------------- Render ----------------
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-[13px]">정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'expired' || pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-[16px] font-bold text-black">접근할 수 없습니다</p>
            <p className="text-[13px] text-gray-600">{errorMsg}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 flex items-center justify-center mx-auto">
              <Heart className="h-8 w-8 text-white fill-white" />
            </div>
            <p className="text-[18px] font-bold text-black">감사합니다!</p>
            <p className="text-[14px] text-gray-600 leading-relaxed">
              소중한 후기를 남겨주셔서 감사합니다.<br />
              여러분의 평가가 다른 분들께 큰 도움이 됩니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === 'already_done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="text-[16px] font-bold text-black">이미 제출하셨습니다</p>
            <p className="text-[13px] text-gray-600">소중한 후기에 감사드립니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // form
  const photographer = info?.bid.bidder;
  const recruitment = info?.bid.recruitment;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* 헤더 */}
        <div className="text-center space-y-2 mb-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 shadow-lg">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-[20px] font-bold text-black">촬영은 어떠셨나요?</h1>
          <p className="text-[13px] text-gray-500">
            작가님께 따뜻한 응원 한마디를 남겨주세요
          </p>
        </div>

        {/* 작가 카드 */}
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="h-20 bg-gradient-to-r from-pink-400 to-fuchsia-500" />
          <CardContent className="pt-0 pb-5">
            <div className="-mt-10 flex items-end gap-3 mb-4">
              <div className="h-20 w-20 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow">
                {photographer?.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photographer.profileImage}
                    alt={photographer.clientName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1 pb-1">
                <p className="text-[16px] font-bold text-black">
                  {photographer?.clientName} 작가님
                </p>
                {recruitment && (
                  <p className="text-[11px] text-gray-500">
                    {SHOOTING_TYPE_LABELS[recruitment.shootingType] || recruitment.shootingType} ·{' '}
                    {format(new Date(recruitment.shootingDate), 'yyyy.MM.dd', { locale: ko })}
                  </p>
                )}
              </div>
            </div>
            {recruitment?.venueName && (
              <p className="text-[12px] text-gray-500 mt-2 px-1">
                📍 {recruitment.venueName}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 좋아요 + 별점 */}
        <Card>
          <CardContent className="py-6 space-y-5">
            {/* 좋아요 토글 */}
            <div className="text-center space-y-3">
              <p className="text-[13px] text-gray-700 font-medium">
                작가님께 좋아요를 눌러주세요
              </p>
              <button
                type="button"
                onClick={() => setLiked(!liked)}
                className={cn(
                  'h-16 w-16 rounded-full flex items-center justify-center mx-auto transition-all',
                  liked
                    ? 'bg-gradient-to-br from-pink-500 to-fuchsia-500 shadow-lg scale-110'
                    : 'bg-gray-100 hover:bg-gray-200',
                )}
              >
                <Heart
                  className={cn(
                    'h-7 w-7 transition-all',
                    liked ? 'text-white fill-white' : 'text-gray-400',
                  )}
                />
              </button>
              <p className={cn(
                'text-[12px] font-medium transition-colors',
                liked ? 'text-pink-600' : 'text-gray-400',
              )}>
                {liked ? '좋아요!' : '눌러서 좋아요'}
              </p>
            </div>

            {/* 별점 */}
            <div className="border-t pt-5 space-y-2.5">
              <p className="text-[13px] text-gray-700 font-medium text-center">
                별점으로 평가해주세요
              </p>
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'h-8 w-8 transition-colors',
                        n <= rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200',
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 메시지 */}
        <Card>
          <CardContent className="py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">이름 (선택)</Label>
              <Input
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="예: 김신랑·박신부"
                maxLength={50}
                className="text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">한마디 (선택)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="작가님께 전하고 싶은 말이 있으면 자유롭게 적어주세요"
                rows={4}
                maxLength={500}
                className="text-[14px] resize-none"
              />
              <p className="text-[11px] text-gray-400 text-right">
                {comment.length} / 500
              </p>
            </div>
          </CardContent>
        </Card>

        {errorMsg && pageState === 'form' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-[12px] text-red-700">{errorMsg}</p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12 text-[14px] font-bold bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 shadow-md"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              제출 중...
            </>
          ) : (
            <>
              <Heart className="h-4 w-4 mr-2 fill-white" />
              후기 남기기
            </>
          )}
        </Button>

        <p className="text-[11px] text-gray-400 text-center px-4">
          제출하신 후기는 작가님과 다른 고객분들께 공유됩니다
        </p>
      </div>
    </div>
  );
}

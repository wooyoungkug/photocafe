'use client';

import Link from 'next/link';
import { CheckCircle2, Home, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function OrderCompletePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 pb-6 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">주문이 완료되었습니다</h1>
          <p className="text-gray-500 mb-8">
            주문해주셔서 감사합니다.<br />
            주문 내역은 마이페이지에서 확인하실 수 있습니다.
          </p>

          {/* Order Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">주문번호</span>
              <span className="font-medium">ORD-{Date.now().toString().slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">예상 제작일</span>
              <span className="font-medium">2~3일 소요</span>
            </div>
          </div>

          {/* Info */}
          <div className="text-left space-y-3 mb-8 text-sm">
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span className="text-gray-600">
                인쇄 파일 검수 후 제작이 시작됩니다.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span className="text-gray-600">
                검수 결과는 문자/이메일로 안내드립니다.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span className="text-gray-600">
                배송 시작 시 송장번호를 발송해드립니다.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/mypage/orders" className="flex-1">
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                주문내역 보기
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button className="w-full">
                <Home className="h-4 w-4 mr-2" />
                홈으로 가기
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

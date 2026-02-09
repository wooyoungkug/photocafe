'use client';

import Link from 'next/link';
import { CheckCircle2, Home, FileText, ArrowRight, Search, Printer, Scissors, BookOpen, PackageCheck, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const processSteps = [
  { label: '주문접수', icon: CheckCircle2, status: 'completed' as const },
  { label: '파일검수', icon: Search, status: 'current' as const },
  { label: '인쇄', icon: Printer, status: 'pending' as const },
  { label: '후가공', icon: Scissors, status: 'pending' as const },
  { label: '제본', icon: BookOpen, status: 'pending' as const },
  { label: '검수', icon: PackageCheck, status: 'pending' as const },
  { label: '포장', icon: Package, status: 'pending' as const },
  { label: '배송', icon: Truck, status: 'pending' as const },
];

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
          <p className="text-gray-500 mb-6">
            주문해주셔서 감사합니다.<br />
            주문 내역은 마이페이지에서 확인하실 수 있습니다.
          </p>

          {/* 공정별 진행표시 */}
          <div className="mb-6 px-2">
            <div className="flex items-center justify-between relative">
              {/* 연결선 */}
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
              <div className="absolute top-4 left-4 h-0.5 bg-green-500 transition-all w-[14.3%]" />
              {processSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex flex-col items-center relative z-10">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                      step.status === 'completed' && 'bg-green-500 text-white',
                      step.status === 'current' && 'bg-blue-500 text-white ring-2 ring-blue-200',
                      step.status === 'pending' && 'bg-gray-200 text-gray-400',
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className={cn(
                      'text-[10px] mt-1 whitespace-nowrap',
                      step.status === 'completed' && 'text-green-600 font-medium',
                      step.status === 'current' && 'text-blue-600 font-medium',
                      step.status === 'pending' && 'text-gray-400',
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

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

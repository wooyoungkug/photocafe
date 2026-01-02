'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  DollarSign,
  Users,
  Building2,
  Calculator,
  ArrowRight,
  Info,
} from 'lucide-react';

const pricingMenus = [
  {
    title: '표준단가',
    description: '모든 거래처에 적용되는 기본 판매 가격입니다.',
    href: '/pricing/standard',
    icon: DollarSign,
    color: 'bg-blue-500',
  },
  {
    title: '그룹단가',
    description: '거래처 그룹별 특별 가격을 설정합니다.',
    href: '/pricing/group',
    icon: Users,
    color: 'bg-green-500',
  },
  {
    title: '거래처 개별단가',
    description: '특정 거래처에만 적용되는 개별 가격입니다.',
    href: '/pricing/client',
    icon: Building2,
    color: 'bg-purple-500',
  },
  {
    title: '가격 계산기',
    description: '옵션을 선택하여 최종 가격을 계산합니다.',
    href: '/pricing/calculator',
    icon: Calculator,
    color: 'bg-orange-500',
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="가격 관리"
        description="상품 및 반제품의 가격 정책을 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '가격관리' },
        ]}
      />

      {/* 가격 우선순위 안내 */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Info className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">가격 적용 우선순위</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                  1. 거래처 개별단가
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                  2. 그룹단가
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-medium">
                  3. 그룹 할인율
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                  4. 표준단가
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                상위 우선순위의 가격이 설정되어 있으면 해당 가격이 적용됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메뉴 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pricingMenus.map((menu) => (
          <Card key={menu.href} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className={`p-3 rounded-lg ${menu.color}`}>
                <menu.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{menu.title}</CardTitle>
                <CardDescription>{menu.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={menu.href}>
                <Button className="w-full" variant="outline">
                  관리하기
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 가격 정책 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">표준단가</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">기본</p>
            <p className="text-xs text-muted-foreground mt-1">
              모든 거래처의 기준 가격
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">그룹 할인</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">일반/보통/우수</p>
            <p className="text-xs text-muted-foreground mt-1">
              거래처 그룹별 할인율 적용
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">개별 단가</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">VIP</p>
            <p className="text-xs text-muted-foreground mt-1">
              특별 거래처 전용 가격
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ImageQualityAnalyzer } from '@/components/image-management/image-quality-analyzer';

export default function ImageQualityAnalysisPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="이미지 품질분석"
        description="결혼사진의 눈감음, 초점불량, 조도불량을 자동으로 감지합니다"
        breadcrumbs={[
          { label: '홈', href: '/dashboard' },
          { label: '이미지관리' },
          { label: '이미지 품질분석' },
        ]}
      />
      <ImageQualityAnalyzer />
    </div>
  );
}

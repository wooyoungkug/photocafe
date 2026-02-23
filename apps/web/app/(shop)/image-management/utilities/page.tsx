'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PdfCreatorTool } from '@/components/image-management/tools/pdf-creator-tool';
import { RatioCalculatorTool } from '@/components/image-management/tools/ratio-calculator-tool';

export default function UtilitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">유틸리티</h1>
        <p className="text-neutral-500 text-sm mt-1">PDF 변환 및 비율 계산 도구</p>
      </div>

      <Tabs defaultValue="pdf">
        <TabsList>
          <TabsTrigger value="pdf">PDF 변환</TabsTrigger>
          <TabsTrigger value="ratio">비율 계산기</TabsTrigger>
        </TabsList>
        <TabsContent value="pdf"><PdfCreatorTool /></TabsContent>
        <TabsContent value="ratio"><RatioCalculatorTool /></TabsContent>
      </Tabs>
    </div>
  );
}

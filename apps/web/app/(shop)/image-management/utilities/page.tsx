'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PdfCreatorTool } from '@/components/image-management/tools/pdf-creator-tool';
import { RatioCalculatorTool } from '@/components/image-management/tools/ratio-calculator-tool';
import { FileRenameTool } from '@/components/image-management/tools/file-rename-tool';

export default function UtilitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">유틸리티</h1>
        <p className="text-neutral-500 text-sm mt-1">PDF 변환, 비율 계산, 파일명 일괄 변환 도구</p>
      </div>

      <Tabs defaultValue="pdf">
        <TabsList>
          <TabsTrigger value="pdf">PDF 변환</TabsTrigger>
          <TabsTrigger value="ratio">비율 계산기</TabsTrigger>
          <TabsTrigger value="rename">파일명 변환</TabsTrigger>
        </TabsList>
        <TabsContent value="pdf"><PdfCreatorTool /></TabsContent>
        <TabsContent value="ratio"><RatioCalculatorTool /></TabsContent>
        <TabsContent value="rename"><FileRenameTool /></TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageRestoreTool } from '@/components/image-management/tools/image-restore-tool';
import { ImageResizeTool } from '@/components/image-management/tools/image-resize-tool';

export default function EnhancementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">이미지 보정</h1>
        <p className="text-neutral-500 text-sm mt-1">이미지 복원(선명도+업스케일) 및 해상도·사이즈 조절</p>
      </div>

      <Tabs defaultValue="restore">
        <TabsList>
          <TabsTrigger value="restore">이미지 복원</TabsTrigger>
          <TabsTrigger value="resize">해상도·사이즈</TabsTrigger>
        </TabsList>
        <TabsContent value="restore"><ImageRestoreTool /></TabsContent>
        <TabsContent value="resize"><ImageResizeTool /></TabsContent>
      </Tabs>
    </div>
  );
}

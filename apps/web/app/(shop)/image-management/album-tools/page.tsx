'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlbumSplitTool } from '@/components/image-management/tools/album-split-tool';
import { AlbumExtendTool } from '@/components/image-management/tools/album-extend-tool';
import { ImageMergeTool } from '@/components/image-management/tools/image-merge-tool';
import { ImageCutTool } from '@/components/image-management/tools/image-cut-tool';

export default function AlbumToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">앨범 편집도구</h1>
        <p className="text-neutral-500 text-sm mt-1">앨범 제작을 위한 이미지 분리, 늘리기, 합치기, 자르기 도구</p>
      </div>

      <Tabs defaultValue="split">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="split">첫장·막장 분리</TabsTrigger>
          <TabsTrigger value="extend">첫장·막장 늘리기</TabsTrigger>
          <TabsTrigger value="merge">JPG 합치기</TabsTrigger>
          <TabsTrigger value="cut">이미지 자르기</TabsTrigger>
        </TabsList>
        <TabsContent value="split"><AlbumSplitTool /></TabsContent>
        <TabsContent value="extend"><AlbumExtendTool /></TabsContent>
        <TabsContent value="merge"><ImageMergeTool /></TabsContent>
        <TabsContent value="cut"><ImageCutTool /></TabsContent>
      </Tabs>
    </div>
  );
}

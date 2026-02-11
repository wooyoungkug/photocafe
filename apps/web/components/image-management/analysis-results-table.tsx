'use client';

import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Focus, Sun, CheckCircle2, AlertTriangle, Grid3X3, List } from 'lucide-react';
import type { AnalysisResult, IssueType, ImageFile } from '@/lib/image-analysis/types';
import { ImagePreviewDialog } from './image-preview-dialog';

interface AnalysisResultsTableProps {
  results: Map<string, AnalysisResult>;
  images: ImageFile[];
  activeFilter: IssueType | 'all';
  onFilterChange: (filter: IssueType | 'all') => void;
}

export function AnalysisResultsTable({
  results,
  images,
  activeFilter,
  onFilterChange,
}: AnalysisResultsTableProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewResult, setPreviewResult] = useState<AnalysisResult | null>(null);
  const [previewFile, setPreviewFile] = useState<File | undefined>();
  const [previewOpen, setPreviewOpen] = useState(false);

  const allResults = useMemo(() => Array.from(results.values()), [results]);

  const counts = useMemo(() => {
    let eyesClosed = 0;
    let blurry = 0;
    let poorLighting = 0;
    let clean = 0;
    for (const r of allResults) {
      if (r.issues.includes('eyes_closed')) eyesClosed++;
      if (r.issues.includes('blurry')) blurry++;
      if (r.issues.includes('poor_lighting')) poorLighting++;
      if (r.issues.length === 0) clean++;
    }
    return { eyesClosed, blurry, poorLighting, clean, total: allResults.length };
  }, [allResults]);

  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return allResults;
    return allResults.filter(r => r.issues.includes(activeFilter));
  }, [allResults, activeFilter]);

  const handleImageClick = useCallback(
    (result: AnalysisResult) => {
      const image = images.find(img => img.id === result.imageId);
      setPreviewResult(result);
      setPreviewFile(image?.file);
      setPreviewOpen(true);
    },
    [images],
  );

  const filterTabs: { key: IssueType | 'all'; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'all', label: '전체', count: counts.total, icon: null },
    { key: 'eyes_closed', label: '눈감음', count: counts.eyesClosed, icon: <Eye className="h-3 w-3" /> },
    { key: 'blurry', label: '초점불량', count: counts.blurry, icon: <Focus className="h-3 w-3" /> },
    { key: 'poor_lighting', label: '조도불량', count: counts.poorLighting, icon: <Sun className="h-3 w-3" /> },
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              분석 결과
              <Badge variant="outline" className="font-normal">
                {counts.total}장 분석 완료
              </Badge>
              {counts.clean > 0 && (
                <Badge variant="secondary" className="font-normal text-green-700 bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  정상 {counts.clean}장
                </Badge>
              )}
              {(counts.eyesClosed + counts.blurry + counts.poorLighting) > 0 && (
                <Badge variant="secondary" className="font-normal text-red-700 bg-red-50">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  문제 {counts.eyesClosed + counts.blurry + counts.poorLighting}장
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 필터 탭 */}
          <div className="flex gap-2 mt-3">
            {filterTabs.map(tab => (
              <Button
                key={tab.key}
                variant={activeFilter === tab.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterChange(tab.key)}
                className="gap-1"
              >
                {tab.icon}
                {tab.label}
                <span className="ml-1 text-xs opacity-70">({tab.count})</span>
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {filteredResults.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              {activeFilter === 'all'
                ? '분석 결과가 없습니다.'
                : '해당 조건의 이미지가 없습니다.'}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {filteredResults.map(result => (
                <div
                  key={result.imageId}
                  className={`
                    relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-colors
                    ${result.issues.length > 0 ? 'border-red-400 hover:border-red-500' : 'border-green-300 hover:border-green-400'}
                  `}
                  onClick={() => handleImageClick(result)}
                >
                  {/* 썸네일 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.thumbnailUrl}
                    alt={result.fileName}
                    className="w-full aspect-square object-cover"
                  />

                  {/* 문제 아이콘 오버레이 */}
                  {result.issues.length > 0 && (
                    <div className="absolute top-1 right-1 flex gap-0.5">
                      {result.issues.includes('eyes_closed') && (
                        <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                          <Eye className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {result.issues.includes('blurry') && (
                        <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                          <Focus className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {result.issues.includes('poor_lighting') && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                          <Sun className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 파일명 오버레이 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white truncate">{result.fileName}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 리스트 뷰 */
            <div className="space-y-1">
              <div className="grid grid-cols-[auto_1fr_100px_80px_80px_60px] gap-3 px-3 py-2 text-xs font-medium text-slate-500 border-b">
                <div className="w-10" />
                <div>파일명</div>
                <div className="text-center">상태</div>
                <div className="text-center">흐림점수</div>
                <div className="text-center">평균밝기</div>
                <div className="text-center">얼굴수</div>
              </div>
              {filteredResults.map(result => (
                <div
                  key={result.imageId}
                  className="grid grid-cols-[auto_1fr_100px_80px_80px_60px] gap-3 px-3 py-2 items-center text-sm hover:bg-slate-50 rounded cursor-pointer"
                  onClick={() => handleImageClick(result)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.thumbnailUrl}
                    alt={result.fileName}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="truncate text-slate-700">{result.fileName}</div>
                  <div className="flex justify-center gap-1 flex-wrap">
                    {result.issues.length === 0 ? (
                      <Badge variant="secondary" className="text-green-700 bg-green-50 text-[10px]">정상</Badge>
                    ) : (
                      result.issues.map(issue => (
                        <Badge key={issue} variant="destructive" className="text-[10px]">
                          {issue === 'eyes_closed' ? '눈감음' : issue === 'blurry' ? '초점불량' : '조도불량'}
                        </Badge>
                      ))
                    )}
                  </div>
                  <div className="text-center text-slate-600">{result.blurScore.toFixed(0)}</div>
                  <div className="text-center text-slate-600">{result.meanBrightness.toFixed(0)}</div>
                  <div className="text-center text-slate-600">{result.facesDetected}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ImagePreviewDialog
        result={previewResult}
        imageFile={previewFile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}

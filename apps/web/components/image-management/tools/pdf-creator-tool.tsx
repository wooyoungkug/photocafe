'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  Upload,
  FolderOpen,
  ImageIcon,
  X,
  GripVertical,
  FileDown,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { fallbackDownload } from '@/lib/image-tools/file-utils';
import { ToolGuide } from './tool-guide';
import { ToolUsageCounter } from './tool-usage-counter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PdfFileItem {
  file: File;
  img: HTMLImageElement;
  url: string;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// PdfCreatorTool
// ---------------------------------------------------------------------------

export function PdfCreatorTool() {
  const [files, setFiles] = useState<PdfFileItem[]>([]);
  const [pageMode, setPageMode] = useState<'single' | 'spread'>('single');
  const [startRight, setStartRight] = useState(false);
  const [fileName, setFileName] = useState('output');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Drag reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const trackUseRef = useRef<(() => void) | null>(null);

  // Set webkitdirectory via ref (non-standard attribute)
  const setFolderRef = useCallback((el: HTMLInputElement | null) => {
    (folderInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    if (el) {
      el.setAttribute('webkitdirectory', '');
      el.setAttribute('directory', '');
    }
  }, []);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // File handling helpers
  // -----------------------------------------------------------------------

  const loadImage = (file: File): Promise<PdfFileItem> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () =>
        resolve({ file, img, url, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`이미지 로드 실패: ${file.name}`));
      };
      img.src = url;
    });

  const addPdfFiles = useCallback(
    async (incoming: File[]) => {
      const jpgFiles = incoming
        .filter((f) => /\.(jpe?g)$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

      if (jpgFiles.length === 0) {
        toast.warning('JPG 파일만 추가할 수 있습니다.');
        return;
      }

      // Deduplicate by name + size
      const existingKeys = new Set(files.map((f) => `${f.file.name}_${f.file.size}`));
      const newFiles = jpgFiles.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));

      if (newFiles.length === 0) {
        toast.info('이미 추가된 파일입니다.');
        return;
      }

      try {
        const items = await Promise.all(newFiles.map(loadImage));
        setFiles((prev) => [...prev, ...items]);
        toast.success(`${items.length}개 파일 추가됨`);
      } catch {
        toast.error('일부 이미지를 로드할 수 없습니다.');
      }
    },
    [files],
  );

  const scanFolder = useCallback(
    async (entry: FileSystemDirectoryEntry): Promise<File[]> => {
      const reader = entry.createReader();
      const allFiles: File[] = [];
      const readBatch = (): Promise<FileSystemEntry[]> =>
        new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      let batch = await readBatch();
      while (batch.length > 0) {
        for (const e of batch) {
          if (e.isFile) {
            const file = await new Promise<File>((res, rej) =>
              (e as FileSystemFileEntry).file(res, rej),
            );
            if (/\.(jpe?g)$/i.test(file.name)) allFiles.push(file);
          } else if (e.isDirectory) {
            const sub = await scanFolder(e as FileSystemDirectoryEntry);
            allFiles.push(...sub);
          }
        }
        batch = await readBatch();
      }
      return allFiles;
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Drop zone handlers
  // -----------------------------------------------------------------------

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const collected: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (!entry) continue;
        if (entry.isDirectory) {
          const dirFiles = await scanFolder(entry as FileSystemDirectoryEntry);
          collected.push(...dirFiles);
        } else if (entry.isFile) {
          const file = await new Promise<File>((res, rej) =>
            (entry as FileSystemFileEntry).file(res, rej),
          );
          collected.push(file);
        }
      }
      if (collected.length > 0) addPdfFiles(collected);
    },
    [addPdfFiles, scanFolder],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addPdfFiles(Array.from(e.target.files));
      e.target.value = '';
    },
    [addPdfFiles],
  );

  // -----------------------------------------------------------------------
  // File list reorder (native HTML5 drag & drop)
  // -----------------------------------------------------------------------

  const handleItemDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    },
    [],
  );

  const handleItemDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverIndex(index);
    },
    [],
  );

  const handleItemDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === targetIndex) {
        setDragIndex(null);
        setDragOverIndex(null);
        return;
      }
      setFiles((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex],
  );

  const handleItemDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearAll = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles([]);
  }, [files]);

  // -----------------------------------------------------------------------
  // Preview computation
  // -----------------------------------------------------------------------

  const pages = computePages(files, pageMode, startRight);

  // -----------------------------------------------------------------------
  // Generate PDF
  // -----------------------------------------------------------------------

  const generatePdf = useCallback(async () => {
    if (files.length === 0) {
      toast.warning('파일을 먼저 추가해 주세요.');
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const pdfDoc = await PDFDocument.create();
      const totalSteps = pages.length;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        if (page.type === 'spread') {
          // Spread mode: 2 images per page (left + right)
          const leftItem = page.left;
          const rightItem = page.right;

          // Determine page dimensions from whichever image is available
          const refItem = leftItem || rightItem;
          if (!refItem) {
            // Blank spread page (shouldn't normally happen)
            pdfDoc.addPage([1200, 600]);
          } else {
            const pageWidth = refItem.width * 2;
            const pageHeight = refItem.height;
            const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

            if (leftItem) {
              const leftBytes = new Uint8Array(await leftItem.file.arrayBuffer());
              const leftImage = await pdfDoc.embedJpg(leftBytes);
              pdfPage.drawImage(leftImage, {
                x: 0,
                y: 0,
                width: leftItem.width,
                height: leftItem.height,
              });
            }

            if (rightItem) {
              const rightBytes = new Uint8Array(await rightItem.file.arrayBuffer());
              const rightImage = await pdfDoc.embedJpg(rightBytes);
              pdfPage.drawImage(rightImage, {
                x: refItem.width,
                y: 0,
                width: rightItem.width,
                height: rightItem.height,
              });
            }
          }
        } else {
          // Single mode: 1 image per page
          if (page.item) {
            const bytes = new Uint8Array(await page.item.file.arrayBuffer());
            const image = await pdfDoc.embedJpg(bytes);
            const pdfPage = pdfDoc.addPage([page.item.width, page.item.height]);
            pdfPage.drawImage(image, {
              x: 0,
              y: 0,
              width: page.item.width,
              height: page.item.height,
            });
          } else {
            // Blank page
            const refSize = files[0];
            pdfDoc.addPage([refSize?.width || 600, refSize?.height || 800]);
          }
        }

        setProgress(Math.round(((i + 1) / totalSteps) * 100));
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const outputName = (fileName.trim() || 'output') + '.pdf';
      fallbackDownload(blob, outputName);
      toast.success(`PDF 생성 완료: ${outputName}`);
      trackUseRef.current?.();
    } catch (err) {
      console.error('PDF 생성 오류:', err);
      toast.error('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  }, [files, pages, pageMode, fileName]);

  // -----------------------------------------------------------------------
  // Utility: format file size
  // -----------------------------------------------------------------------

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Guide */}
      <ToolGuide title="PDF 만들기 사용 방법">
        <div className="pt-3 space-y-3">
          <svg viewBox="0 0 400 120" className="w-full max-w-[400px]" xmlns="http://www.w3.org/2000/svg">
            {/* Three JPG image icons */}
            <rect x="10" y="25" width="45" height="55" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="32" y="58" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#3B82F6">JPG</text>
            <rect x="65" y="25" width="45" height="55" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="87" y="58" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#3B82F6">JPG</text>
            <rect x="120" y="25" width="45" height="55" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="142" y="58" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#3B82F6">JPG</text>
            {/* Ellipsis dots */}
            <text x="87" y="100" textAnchor="middle" fontSize="11" fill="#64748B">이미지 파일들</text>
            {/* Arrow */}
            <path d="M185 52 L235 52" stroke="#64748B" strokeWidth="2" fill="none" markerEnd="url(#pdf-arrow)" />
            <defs>
              <marker id="pdf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
              </marker>
            </defs>
            {/* PDF document icon */}
            <rect x="255" y="10" width="80" height="95" rx="4" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.5" />
            {/* Dog-ear fold */}
            <path d="M315 10 L335 30 L315 30 Z" fill="#FECACA" stroke="#EF4444" strokeWidth="1" />
            <text x="295" y="55" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#EF4444">PDF</text>
            {/* Page lines */}
            <line x1="270" y1="70" x2="320" y2="70" stroke="#FCA5A5" strokeWidth="1" />
            <line x1="270" y1="78" x2="310" y2="78" stroke="#FCA5A5" strokeWidth="1" />
            <line x1="270" y1="86" x2="315" y2="86" stroke="#FCA5A5" strokeWidth="1" />
            {/* Label */}
            <text x="295" y="118" textAnchor="middle" fontSize="11" fill="#64748B">PDF 변환</text>
          </svg>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>여러 JPG/PNG 이미지를 하나의 PDF로 합치기</li>
            <li>드래그로 페이지 순서 변경 가능</li>
            <li>가로/세로 자동 감지로 페이지 방향 결정</li>
            <li>파일명 지정 가능</li>
          </ul>
        </div>
      </ToolGuide>

      {/* Drop zone */}
      <Card>
        <CardContent className="p-6">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-700">
                  JPG 이미지를 드래그하여 놓거나 클릭하세요
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  JPG/JPEG 파일만 지원 (다중 선택 / 폴더 업로드 가능)
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  파일 선택
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    folderInputRef.current?.click();
                  }}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  폴더 선택
                </Button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <input
            ref={setFolderRef}
            type="file"
            accept=".jpg,.jpeg"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </CardContent>
      </Card>

      {/* File list */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                파일 목록
                <Badge variant="secondary">{files.length}개</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <Trash2 className="h-4 w-4 mr-1" />
                전체 삭제
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-3">
              드래그하여 순서를 변경할 수 있습니다.
            </p>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {files.map((item, index) => (
                <div
                  key={`${item.file.name}-${item.file.size}-${index}`}
                  draggable
                  onDragStart={(e) => handleItemDragStart(e, index)}
                  onDragOver={(e) => handleItemDragOver(e, index)}
                  onDrop={(e) => handleItemDrop(e, index)}
                  onDragEnd={handleItemDragEnd}
                  className={`flex items-center gap-3 p-2 rounded-md border transition-colors ${
                    dragIndex === index
                      ? 'opacity-50 border-blue-300 bg-blue-50'
                      : dragOverIndex === index
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-slate-400 cursor-grab flex-shrink-0" />
                  <span className="text-xs font-mono text-slate-400 w-6 text-right flex-shrink-0">
                    {index + 1}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.file.name}
                    className="w-10 h-10 object-cover rounded border flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(item.file.size)} / {item.width} x {item.height}px
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Options */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">옵션</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Page mode */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">페이지 모드</Label>
              <RadioGroup
                value={pageMode}
                onValueChange={(v) => setPageMode(v as 'single' | 'spread')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="mode-single" />
                  <Label htmlFor="mode-single" className="cursor-pointer">
                    단면
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spread" id="mode-spread" />
                  <Label htmlFor="mode-spread" className="cursor-pointer">
                    펼침면
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Start direction */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">시작 방향</Label>
              <RadioGroup
                value={startRight ? 'right' : 'left'}
                onValueChange={(v) => setStartRight(v === 'right')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="left" id="dir-left" />
                  <Label htmlFor="dir-left" className="cursor-pointer">
                    왼쪽부터
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="right" id="dir-right" />
                  <Label htmlFor="dir-right" className="cursor-pointer">
                    오른쪽부터
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* File name */}
            <div className="space-y-2">
              <Label htmlFor="pdf-filename" className="text-sm font-medium">
                파일명
              </Label>
              <div className="flex items-center gap-2 max-w-xs">
                <Input
                  id="pdf-filename"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="output"
                />
                <span className="text-sm text-muted-foreground flex-shrink-0">.pdf</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page preview */}
      {files.length > 0 && pages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              페이지 미리보기
              <Badge variant="outline">{pages.length}페이지</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {pages.map((page, i) => (
                <PagePreviewCard key={i} page={page} index={i} mode={pageMode} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress & Generate */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            {processing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">PDF 생성 중...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={generatePdf}
              disabled={processing || files.length === 0}
            >
              <FileDown className="h-5 w-5 mr-2" />
              {processing ? 'PDF 생성 중...' : 'PDF 생성'}
            </Button>
          </CardContent>
        </Card>
      )}

      <ToolUsageCounter toolId="pdf-creator" onTrackUse={(fn) => { trackUseRef.current = fn; }} />
    </div>
  );
}

// ===========================================================================
// Page layout computation
// ===========================================================================

interface SpreadPage {
  left: PdfFileItem | null;
  right: PdfFileItem | null;
}

interface SinglePage {
  item: PdfFileItem | null;
}

type PageInfo =
  | (SpreadPage & { type: 'spread' })
  | (SinglePage & { type: 'single' });

function computePages(
  files: PdfFileItem[],
  mode: 'single' | 'spread',
  startRight: boolean,
): PageInfo[] {
  if (files.length === 0) return [];

  if (mode === 'spread') {
    const items: (PdfFileItem | null)[] = [];

    // If starting from right, first page has blank left
    if (startRight) {
      items.push(null);
    }

    items.push(...files);

    // If odd count, add blank at end
    if (items.length % 2 !== 0) {
      items.push(null);
    }

    const pages: PageInfo[] = [];
    for (let i = 0; i < items.length; i += 2) {
      pages.push({
        type: 'spread',
        left: items[i],
        right: items[i + 1] || null,
      });
    }
    return pages;
  }

  // Single mode
  const pages: PageInfo[] = [];

  if (startRight) {
    // Blank first page
    pages.push({ type: 'single', item: null });
  }

  for (const item of files) {
    pages.push({ type: 'single', item });
  }

  // If startRight and even total files, add blank at end
  if (startRight && files.length % 2 === 0) {
    pages.push({ type: 'single', item: null });
  }

  return pages;
}

// ===========================================================================
// PagePreviewCard
// ===========================================================================

function PagePreviewCard({
  page,
  index,
  mode,
}: {
  page: PageInfo;
  index: number;
  mode: 'single' | 'spread';
}) {
  if (page.type === 'spread') {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex border rounded overflow-hidden bg-white shadow-sm">
          <PreviewThumb item={page.left} />
          <div className="w-px bg-slate-300" />
          <PreviewThumb item={page.right} />
        </div>
        <span className="text-xs text-muted-foreground">P{index + 1}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="border rounded overflow-hidden bg-white shadow-sm">
        <PreviewThumb item={page.item} />
      </div>
      <span className="text-xs text-muted-foreground">P{index + 1}</span>
    </div>
  );
}

function PreviewThumb({ item }: { item: PdfFileItem | null }) {
  if (!item) {
    return (
      <div className="w-16 h-20 flex items-center justify-center bg-slate-100 text-xs text-slate-400">
        빈 페이지
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt={item.file.name}
      className="w-16 h-20 object-cover"
    />
  );
}

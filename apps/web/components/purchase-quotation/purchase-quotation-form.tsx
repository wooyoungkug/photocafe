'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Upload,
  Trash2,
  ExternalLink,
  Paperclip,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useCreatePurchaseQuotation,
  useUpdatePurchaseQuotation,
  useUploadPurchaseQuotationFile,
} from '@/hooks/use-purchase-quotation';
import {
  PurchaseQuotation,
  PurchaseQuotationFile,
} from '@/lib/types/purchase-quotation';
import { API_BASE_URL } from '@/lib/api';

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fileViewUrl(url: string): string {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url}`;
}

interface Props {
  mode: 'create' | 'edit';
  initial?: PurchaseQuotation;
}

export function PurchaseQuotationForm({ mode, initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vendorName, setVendorName] = useState(initial?.vendorName ?? '');
  const [receivedAt, setReceivedAt] = useState(
    initial?.receivedAt
      ? new Date(initial.receivedAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [manager, setManager] = useState(initial?.manager ?? '');
  const [department, setDepartment] = useState(initial?.department ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [files, setFiles] = useState<PurchaseQuotationFile[]>(
    initial?.files ?? [],
  );

  const createMutation = useCreatePurchaseQuotation();
  const updateMutation = useUpdatePurchaseQuotation();
  const uploadMutation = useUploadPurchaseQuotationFile();

  const submitting = createMutation.isPending || updateMutation.isPending;
  const uploading = uploadMutation.isPending;

  const handlePickFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const picked = Array.from(list);
    e.target.value = ''; // reset for re-select same file

    for (const file of picked) {
      try {
        const uploaded = await uploadMutation.mutateAsync(file);
        setFiles((prev) => [...prev, uploaded]);
      } catch (err: any) {
        toast({
          title: `${file.name} 업로드 실패`,
          description: err?.message,
          variant: 'destructive',
        });
      }
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!vendorName.trim()) {
      toast({ title: '매입처명을 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!receivedAt) {
      toast({ title: '받은날짜를 선택해주세요.', variant: 'destructive' });
      return;
    }

    const dto = {
      vendorName: vendorName.trim(),
      receivedAt,
      manager: manager.trim() || undefined,
      department: department.trim() || undefined,
      title: title.trim() || undefined,
      note: note.trim() || undefined,
      files,
    };

    try {
      if (mode === 'create') {
        const created = await createMutation.mutateAsync(dto);
        toast({ title: '매입처 견적이 등록되었습니다.' });
        router.push(`/cs/purchase-quotations/${created.id}`);
      } else if (initial) {
        await updateMutation.mutateAsync({ id: initial.id, dto });
        toast({ title: '매입처 견적이 수정되었습니다.' });
        router.push(`/cs/purchase-quotations/${initial.id}`);
      }
    } catch (err: any) {
      toast({
        title: mode === 'create' ? '등록에 실패했습니다.' : '수정에 실패했습니다.',
        description: err?.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-[24px] text-black font-normal">
          {mode === 'create' ? '매입처 견적 등록' : '매입처 견적 수정'}
        </h1>
        <p className="text-[14px] text-black font-normal mt-1">
          거래처에서 받은 견적서를 등록합니다
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[14px] text-black font-normal">
                매입처명 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="예: 서울지업사"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">
                받은날짜 <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">
                담당자
              </Label>
              <Input
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                placeholder="예: 김영업"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">
                관련부서
              </Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="예: 자재팀"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-[14px] text-black font-normal">제목</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="견적 제목 또는 내용 요약"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[14px] text-black font-normal">메모</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="추가 메모 / 협상 내용 / 비고"
              rows={4}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            첨부파일
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFilesSelected}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handlePickFiles}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            파일 추가 (PDF / JPG / PNG, 최대 50MB)
          </Button>

          {files.length > 0 && (
            <div className="border rounded-md divide-y">
              {files.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="text-[14px] text-black font-normal truncate">
                      {f.name}
                    </span>
                    {f.size !== undefined && (
                      <span className="text-[14px] text-gray-500 font-normal shrink-0">
                        ({formatBytes(f.size)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={fileViewUrl(f.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          취소
        </Button>
        <Button
          className="bg-pink-500 hover:bg-pink-600"
          onClick={handleSubmit}
          disabled={submitting || uploading}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? '등록' : '저장'}
        </Button>
      </div>
    </div>
  );
}

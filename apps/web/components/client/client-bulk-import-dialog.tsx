'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Upload, Loader2, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 엑셀 컬럼 정의 (한글 헤더 ↔ 내부 키 매핑)
const COLUMNS: Array<{ key: string; header: string; required?: boolean; example: string }> = [
  { key: 'clientCode', header: '회원코드', example: 'M0001 (비우면 자동채번)' },
  { key: 'clientName', header: '회원명', required: true, example: '홍길동' },
  { key: 'businessNumber', header: '사업자번호', example: '123-45-67890' },
  { key: 'representative', header: '대표자', example: '홍길동' },
  { key: 'phone', header: '전화번호', example: '02-1234-5678' },
  { key: 'mobile', header: '휴대폰', example: '010-1234-5678' },
  { key: 'email', header: '이메일', example: 'contact@example.com' },
  { key: 'postalCode', header: '우편번호', example: '12345' },
  { key: 'address', header: '주소', example: '서울시 강남구 ...' },
  { key: 'addressDetail', header: '상세주소', example: '101호' },
  { key: 'groupName', header: '그룹명', example: '표준단가그룹' },
  { key: 'creditGrade', header: '신용등급', example: 'A / B / C / D' },
  { key: 'paymentTerms', header: '결제조건(일)', example: '30' },
  { key: 'status', header: '상태', example: 'active / inactive / suspended' },
];

interface ParsedRow {
  rowNum: number;
  data: Record<string, any>;
  errors: string[];
}

interface BulkResult {
  total: number;
  successCount: number;
  failedCount: number;
  success: Array<{ row: number; clientCode: string; clientName: string }>;
  failed: Array<{ row: number; clientName?: string; reason: string }>;
}

export function ClientBulkImportDialog({ open, onOpenChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const queryClient = useQueryClient();

  const handleDownloadTemplate = () => {
    // 첫 행: 한글 헤더 / 둘째 행: 예시
    const headers = COLUMNS.map((c) => c.header + (c.required ? ' *' : ''));
    const example = COLUMNS.map((c) => c.example);
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);

    // 컬럼 폭 자동
    ws['!cols'] = COLUMNS.map((c) => ({
      wch: Math.max(c.header.length, c.example.length, 12),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '회원목록');
    XLSX.writeFile(wb, '회원_일괄등록_양식.xlsx');
  };

  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

      if (aoa.length < 2) {
        toast.error('데이터가 없습니다. 헤더 행 + 1개 이상의 데이터 행이 필요합니다.');
        return;
      }

      // 헤더 매핑: 한글 헤더 → 내부 키 (* 제거, 공백 트림)
      const headerRow = (aoa[0] as any[]).map((h) => String(h ?? '').replace(/\*/g, '').trim());
      const headerToKey = new Map<number, string>();
      headerRow.forEach((h, idx) => {
        const col = COLUMNS.find((c) => c.header === h);
        if (col) headerToKey.set(idx, col.key);
      });

      if (headerToKey.size === 0) {
        toast.error('헤더를 인식할 수 없습니다. 양식 다운로드 후 사용해 주세요.');
        return;
      }

      const rows: ParsedRow[] = [];
      const seenCodes = new Set<string>();
      const seenEmails = new Set<string>();

      // 예시 행 스킵 처리: 첫 데이터 행이 정확히 example 과 일치하면 건너뜀
      const exampleSet = new Set(COLUMNS.map((c) => c.example));

      for (let i = 1; i < aoa.length; i++) {
        const arr = aoa[i] as any[];
        if (!arr || arr.every((v) => v === '' || v === null || v === undefined)) continue;

        const data: Record<string, any> = {};
        headerToKey.forEach((key, idx) => {
          const v = arr[idx];
          data[key] = v === undefined || v === null ? '' : String(v).trim();
        });

        // 예시 행 자동 제외
        const looksLikeExample =
          (data.clientCode && exampleSet.has(data.clientCode)) ||
          (data.clientName === '홍길동' && data.email === 'contact@example.com');
        if (looksLikeExample) continue;

        const errors: string[] = [];
        if (!data.clientName) errors.push('회원명 누락');
        if (data.clientCode) {
          if (seenCodes.has(data.clientCode)) errors.push(`파일 내 회원코드 중복: ${data.clientCode}`);
          seenCodes.add(data.clientCode);
        }
        if (data.email) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('이메일 형식 오류');
          else {
            if (seenEmails.has(data.email)) errors.push(`파일 내 이메일 중복: ${data.email}`);
            seenEmails.add(data.email);
          }
        }
        if (data.creditGrade) {
          const g = data.creditGrade.toUpperCase();
          if (!['A', 'B', 'C', 'D'].includes(g)) errors.push(`신용등급 오류: ${data.creditGrade}`);
        }
        if (data.status) {
          const s = data.status.toLowerCase();
          if (!['active', 'inactive', 'suspended'].includes(s)) errors.push(`상태값 오류: ${data.status}`);
        }
        if (data.paymentTerms !== '' && data.paymentTerms !== undefined) {
          const n = Number(data.paymentTerms);
          if (Number.isNaN(n) || n < 0 || n > 365) errors.push(`결제조건 오류: ${data.paymentTerms}`);
        }

        rows.push({ rowNum: i + 1, data, errors });
      }

      if (rows.length === 0) {
        toast.error('등록할 데이터가 없습니다.');
        return;
      }

      setParsedRows(rows);
      const errCount = rows.filter((r) => r.errors.length > 0).length;
      if (errCount > 0) {
        toast.warning(`${rows.length}건 중 ${errCount}건에 오류가 있습니다. 빨간 행을 확인하세요.`);
      } else {
        toast.success(`${rows.length}건이 정상적으로 분석되었습니다.`);
      }
    } catch (e: any) {
      toast.error('파일 분석 실패: ' + (e?.message || '알 수 없는 오류'));
    }
  };

  const handleUpload = async () => {
    const validRows = parsedRows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error('등록 가능한 행이 없습니다.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.post<BulkResult>('/clients/bulk', {
        rows: validRows.map((r) => r.data),
      });
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      if (res.successCount > 0) {
        toast.success(`${res.successCount}건 등록 완료`);
      }
      if (res.failedCount > 0) {
        toast.warning(`${res.failedCount}건은 등록에 실패했습니다.`);
      }
    } catch (e: any) {
      toast.error('일괄등록 실패: ' + (e?.message || '서버 오류'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setParsedRows([]);
    setFileName('');
    setResult(null);
    onOpenChange(false);
  };

  const errorRowCount = parsedRows.filter((r) => r.errors.length > 0).length;
  const validRowCount = parsedRows.length - errorRowCount;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            회원 엑셀 일괄등록
          </DialogTitle>
          <DialogDescription>
            양식을 다운로드해 작성한 후 업로드하세요. 예시 행은 자동으로 제외됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 1단계: 양식 다운로드 + 업로드 */}
          {!result && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  양식 다운로드
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                    e.target.value = '';
                  }}
                />
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  엑셀 파일 선택
                </Button>
                {fileName && (
                  <span className="text-sm text-muted-foreground">📎 {fileName}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                * 표시 컬럼은 필수입니다. 회원코드는 비우면 자동채번(M0001 다음번호)됩니다.
                그룹명은 시스템에 등록된 그룹과 정확히 일치해야 합니다.
              </p>
            </div>
          )}

          {/* 2단계: 미리보기 */}
          {!result && parsedRows.length > 0 && (
            <div className="border rounded-lg">
              <div className="p-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span>총 {parsedRows.length}건</span>
                  <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                    정상 {validRowCount}건
                  </Badge>
                  {errorRowCount > 0 && (
                    <Badge variant="destructive">오류 {errorRowCount}건</Badge>
                  )}
                </div>
              </div>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">행</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>회원코드</TableHead>
                      <TableHead>회원명</TableHead>
                      <TableHead>휴대폰</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>그룹</TableHead>
                      <TableHead>오류 사유</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((r) => (
                      <TableRow
                        key={r.rowNum}
                        className={r.errors.length > 0 ? 'bg-red-50' : ''}
                      >
                        <TableCell className="font-mono text-xs">{r.rowNum}</TableCell>
                        <TableCell>
                          {r.errors.length > 0 ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.data.clientCode || <span className="text-muted-foreground">자동</span>}
                        </TableCell>
                        <TableCell>{r.data.clientName}</TableCell>
                        <TableCell>{r.data.mobile || '-'}</TableCell>
                        <TableCell>{r.data.email || '-'}</TableCell>
                        <TableCell>{r.data.groupName || '-'}</TableCell>
                        <TableCell className="text-red-600 text-xs">
                          {r.errors.join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* 3단계: 결과 리포트 */}
          {result && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="text-base font-semibold">등록 완료</h3>
                  <p className="text-sm text-muted-foreground">
                    총 {result.total}건 중 성공 {result.successCount}건 / 실패 {result.failedCount}건
                  </p>
                </div>
              </div>

              {result.failed.length > 0 && (
                <div className="border rounded">
                  <div className="p-2 bg-red-50 border-b text-sm font-medium text-red-800">
                    실패한 행 ({result.failed.length}건)
                  </div>
                  <div className="max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">행</TableHead>
                          <TableHead>회원명</TableHead>
                          <TableHead>실패 사유</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.failed.map((f, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{f.row}</TableCell>
                            <TableCell>{f.clientName || '-'}</TableCell>
                            <TableCell className="text-red-600 text-xs">{f.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? '닫기' : '취소'}
          </Button>
          {!result && parsedRows.length > 0 && (
            <Button
              onClick={handleUpload}
              disabled={isUploading || validRowCount === 0}
            >
              {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {validRowCount}건 등록 실행
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useRef, useState, useMemo } from 'react';
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
import {
  Download,
  Upload,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useBulkImportStaff, useDepartments, useBranches } from '@/hooks/use-staff';
import { useTeams } from '@/hooks/use-team';
import type { CreateStaffRequest } from '@/lib/types/staff';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 엑셀 컬럼 정의 (한글 헤더 ↔ 내부 키 매핑)
const COLUMNS: Array<{
  key: string;
  header: string;
  required?: boolean;
  example: string;
  description?: string;
}> = [
  { key: 'staffId', header: '직원ID', required: true, example: 'hong01', description: '영문/숫자/언더스코어 2자 이상' },
  { key: 'password', header: '비밀번호', required: true, example: 'pass1234', description: '최소 4자 (자동 암호화)' },
  { key: 'name', header: '이름', required: true, example: '홍길동' },
  { key: 'position', header: '직책', example: '대리' },
  { key: 'departmentName', header: '부서', example: '경영지원팀' },
  { key: 'branchName', header: '지점', example: '본사' },
  { key: 'teamName', header: '팀', example: '재무팀' },
  { key: 'mobile', header: '휴대폰', example: '010-1234-5678' },
  { key: 'phone', header: '전화', example: '02-1234-5678' },
  { key: 'email', header: '이메일', example: 'hong@example.com' },
  { key: 'postalCode', header: '우편번호', example: '06234' },
  { key: 'address', header: '주소', example: '서울시 강남구 ...' },
  { key: 'addressDetail', header: '상세주소', example: '101호' },
  { key: 'joinDate', header: '입사일', example: '2026-01-15' },
  { key: 'settlementGrade', header: '정산등급', example: '1 (0~15)' },
];

interface ParsedRow {
  rowNum: number;
  data: Record<string, any>;
  errors: string[];
}

export function StaffBulkImportDialog({ open, onOpenChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<{
    imported: number;
    errors: { row: number; staffId: string; message: string }[];
  } | null>(null);

  const bulkImport = useBulkImportStaff();
  const { data: departments } = useDepartments();
  const { data: branches } = useBranches();
  const { data: teams } = useTeams();

  // 양식 다운로드: 헤더 + 예시 1행 + 사용 가능한 부서/지점/팀 안내 시트
  const handleDownloadTemplate = () => {
    const headers = COLUMNS.map((c) => c.header + (c.required ? ' *' : ''));
    const example = COLUMNS.map((c) => c.example);
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = COLUMNS.map((c) => ({
      wch: Math.max(c.header.length + 2, c.example.length, 14),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '직원목록');

    // 참고 시트: 등록된 부서/지점/팀 이름 안내
    const refRows: any[][] = [['종류', '이름']];
    departments?.forEach((d) => refRows.push(['부서', d.name]));
    branches?.forEach((b) => refRows.push(['지점', b.branchName]));
    teams?.forEach((t) => refRows.push(['팀', t.name]));
    if (refRows.length > 1) {
      const refWs = XLSX.utils.aoa_to_sheet(refRows);
      refWs['!cols'] = [{ wch: 8 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, refWs, '부서_지점_팀_참고');
    }

    XLSX.writeFile(wb, '직원_일괄등록_양식.xlsx');
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
        toast.error('데이터가 없습니다. 헤더 + 1개 이상의 데이터 행이 필요합니다.');
        return;
      }

      // 헤더 매핑: 한글 헤더(공백·* 제거) → 내부 키
      const headerRow = (aoa[0] as any[]).map((h) =>
        String(h ?? '').replace(/\*/g, '').trim(),
      );
      const headerToKey = new Map<number, string>();
      headerRow.forEach((h, idx) => {
        const col = COLUMNS.find((c) => c.header === h);
        if (col) headerToKey.set(idx, col.key);
      });

      if (headerToKey.size === 0) {
        toast.error('헤더를 인식할 수 없습니다. 양식 다운로드 후 사용해주세요.');
        return;
      }

      const rows: ParsedRow[] = [];
      const seenStaffIds = new Set<string>();
      const seenEmails = new Set<string>();
      const deptNames = new Set((departments ?? []).map((d) => d.name.trim()));
      const branchNames = new Set((branches ?? []).map((b) => b.branchName.trim()));
      const teamNames = new Set((teams ?? []).map((t) => t.name.trim()));
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
          data.staffId === 'hong01' &&
          data.name === '홍길동' &&
          exampleSet.has(data.password ?? '');
        if (looksLikeExample) continue;

        const errors: string[] = [];

        // 필수
        if (!data.staffId) errors.push('직원ID 누락');
        if (!data.password) errors.push('비밀번호 누락');
        if (!data.name) errors.push('이름 누락');

        // 직원ID 형식
        if (data.staffId) {
          if (!/^[a-zA-Z0-9_]+$/.test(data.staffId)) {
            errors.push('직원ID는 영문/숫자/언더스코어만 가능');
          }
          if (data.staffId.length < 2) errors.push('직원ID 2자 이상 필요');
          if (seenStaffIds.has(data.staffId)) errors.push(`파일 내 ID 중복: ${data.staffId}`);
          seenStaffIds.add(data.staffId);
        }

        // 비밀번호 길이
        if (data.password && data.password.length < 4) {
          errors.push('비밀번호 4자 이상');
        }

        // 이메일
        if (data.email) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('이메일 형식 오류');
          } else if (seenEmails.has(data.email)) {
            errors.push(`파일 내 이메일 중복: ${data.email}`);
          } else {
            seenEmails.add(data.email);
          }
        }

        // 부서/지점/팀 이름 존재 검증 (서버에서도 재검증)
        if (data.departmentName && !deptNames.has(data.departmentName)) {
          errors.push(`등록되지 않은 부서: ${data.departmentName}`);
        }
        if (data.branchName && !branchNames.has(data.branchName)) {
          errors.push(`등록되지 않은 지점: ${data.branchName}`);
        }
        if (data.teamName && !teamNames.has(data.teamName)) {
          errors.push(`등록되지 않은 팀: ${data.teamName}`);
        }

        // 입사일
        if (data.joinDate) {
          const d = new Date(data.joinDate);
          if (Number.isNaN(d.getTime())) {
            errors.push(`입사일 형식 오류: ${data.joinDate}`);
          } else {
            data.joinDate = d.toISOString().slice(0, 10);
          }
        }

        // 정산등급
        if (data.settlementGrade !== '' && data.settlementGrade !== undefined) {
          const raw = String(data.settlementGrade).match(/\d+/)?.[0];
          if (!raw) {
            errors.push(`정산등급 숫자 아님: ${data.settlementGrade}`);
          } else {
            const n = Number(raw);
            if (n < 0 || n > 15) errors.push(`정산등급 범위 오류 (0~15): ${n}`);
            else data.settlementGrade = n;
          }
        } else {
          delete data.settlementGrade;
        }

        // 빈 값 정리
        Object.keys(data).forEach((k) => {
          if (data[k] === '') delete data[k];
        });

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
        toast.success(`${rows.length}건이 정상 분석되었습니다.`);
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
    try {
      const res = await bulkImport.mutateAsync(
        validRows.map((r) => r.data) as CreateStaffRequest[],
      );
      setResult(res);
      if (res.imported > 0) toast.success(`${res.imported}건 등록 완료`);
      if (res.errors.length > 0) toast.warning(`${res.errors.length}건 등록 실패`);
    } catch (e: any) {
      toast.error('일괄등록 실패: ' + (e?.message || '서버 오류'));
    }
  };

  const handleClose = () => {
    setParsedRows([]);
    setFileName('');
    setResult(null);
    onOpenChange(false);
  };

  const errorRowCount = useMemo(
    () => parsedRows.filter((r) => r.errors.length > 0).length,
    [parsedRows],
  );
  const validRowCount = parsedRows.length - errorRowCount;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[18px] font-bold text-black">
            <FileSpreadsheet className="h-5 w-5" />
            직원 엑셀 일괄등록
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            양식을 다운로드해 작성한 후 업로드하세요. 예시 행은 자동으로 제외됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 1단계: 양식 다운로드 + 업로드 */}
          {!result && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  양식 다운로드 (.xlsx)
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  aria-label="직원 명부 엑셀 파일"
                  title="직원 명부 엑셀 파일"
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
                  <span className="text-[13px] text-muted-foreground">
                    📎 {fileName}
                  </span>
                )}
              </div>
              <div className="flex items-start gap-2 text-[12px] text-gray-600 bg-blue-50/40 rounded p-2.5">
                <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p>
                    * 표시 컬럼(직원ID, 비밀번호, 이름)은 필수입니다. 비밀번호는 서버에서 자동 암호화되어 저장됩니다.
                  </p>
                  <p>
                    부서/지점/팀은 이름으로 입력하면 자동 매칭됩니다. 양식의 두 번째 시트(참고)에서 등록된 목록을 확인하세요.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2단계: 미리보기 */}
          {!result && parsedRows.length > 0 && (
            <div className="border rounded-lg">
              <div className="p-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-3 text-[13px]">
                  <span>총 {parsedRows.length}건</span>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
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
                      <TableHead className="w-12">상태</TableHead>
                      <TableHead>직원ID</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>직책</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead>휴대폰</TableHead>
                      <TableHead>오류 사유</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((r) => (
                      <TableRow
                        key={r.rowNum}
                        className={r.errors.length > 0 ? 'bg-red-50' : ''}
                      >
                        <TableCell className="font-mono text-[11px]">{r.rowNum}</TableCell>
                        <TableCell>
                          {r.errors.length > 0 ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-[12px]">
                          {r.data.staffId || '-'}
                        </TableCell>
                        <TableCell className="text-[13px]">{r.data.name || '-'}</TableCell>
                        <TableCell className="text-[12px] text-gray-600">
                          {r.data.position || '-'}
                        </TableCell>
                        <TableCell className="text-[12px] text-gray-600">
                          {r.data.departmentName || '-'}
                        </TableCell>
                        <TableCell className="text-[12px] text-gray-600">
                          {r.data.mobile || '-'}
                        </TableCell>
                        <TableCell className="text-red-600 text-[11px]">
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
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="text-[15px] font-bold text-black">등록 완료</h3>
                  <p className="text-[13px] text-gray-600">
                    성공 {result.imported}건 / 실패 {result.errors.length}건
                  </p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="border rounded">
                  <div className="p-2 bg-red-50 border-b text-[13px] font-medium text-red-800">
                    실패한 행 ({result.errors.length}건)
                  </div>
                  <div className="max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">행</TableHead>
                          <TableHead>직원ID</TableHead>
                          <TableHead>실패 사유</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.errors.map((f, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-[11px]">{f.row}</TableCell>
                            <TableCell className="font-mono text-[12px]">{f.staffId}</TableCell>
                            <TableCell className="text-red-600 text-[11px]">
                              {f.message}
                            </TableCell>
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
              disabled={bulkImport.isPending || validRowCount === 0}
            >
              {bulkImport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {validRowCount}건 등록 실행
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

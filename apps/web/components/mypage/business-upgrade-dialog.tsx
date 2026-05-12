'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DaumAddressFields } from '@/components/daum-address-fields';
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  Paperclip,
  Search,
  Sparkles,
  XCircle,
  AlertTriangle,
  HelpCircle,
  CalendarDays,
} from 'lucide-react';
import {
  useSubmitBusinessUpgrade,
  useUploadBusinessCert,
  useAnalyzeBusinessCert,
  useVerifyBusinessStatus,
  type NtsStatus,
} from '@/hooks/use-business-upgrade';

function formatBusinessNumber(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 10);
  if (nums.length > 5) return `${nums.slice(0, 3)}-${nums.slice(3, 5)}-${nums.slice(5)}`;
  if (nums.length > 3) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return nums;
}

function formatPhone(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 11);
  if (nums.startsWith('02')) {
    if (nums.length > 6) return `${nums.slice(0, 2)}-${nums.slice(2, 6)}-${nums.slice(6)}`;
    if (nums.length > 2) return `${nums.slice(0, 2)}-${nums.slice(2)}`;
    return nums;
  }
  if (nums.length > 7) return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  if (nums.length > 3) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return nums;
}

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const MAX_SIZE = 10 * 1024 * 1024;

function NtsStatusBadge({ status, statusText }: { status: NtsStatus; statusText: string }) {
  if (status === 'active')
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 font-normal text-[12px]">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {statusText}
      </Badge>
    );
  if (status === 'suspended')
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 font-normal text-[12px]">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {statusText}
      </Badge>
    );
  if (status === 'closed')
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 font-normal text-[12px]">
        <XCircle className="h-3 w-3 mr-1" />
        {statusText}
      </Badge>
    );
  return (
    <Badge className="bg-gray-100 text-gray-600 border-gray-200 font-normal text-[12px]">
      <HelpCircle className="h-3 w-3 mr-1" />
      {statusText}
    </Badge>
  );
}

interface Props {
  children?: React.ReactNode;
  onSubmitted?: () => void;
}

export function BusinessUpgradeDialog({ children, onSubmitted }: Props) {
  const [open, setOpen] = useState(false);

  const uploadCert = useUploadBusinessCert();
  const analyzeCert = useAnalyzeBusinessCert();
  const verifyStatus = useVerifyBusinessStatus();
  const submitUpgrade = useSubmitBusinessUpgrade();

  const [businessNumber, setBusinessNumber] = useState('');
  const [representative, setRepresentative] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [taxInvoiceEmail, setTaxInvoiceEmail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  const [practicalManagerName, setPracticalManagerName] = useState('');
  const [practicalManagerPhone, setPracticalManagerPhone] = useState('');
  const [approvalManagerName, setApprovalManagerName] = useState('');
  const [approvalManagerPhone, setApprovalManagerPhone] = useState('');

  const [certUploadKey, setCertUploadKey] = useState<string | null>(null);
  const [certFileName, setCertFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // NTS 상태
  const [ntsResult, setNtsResult] = useState<{ status: NtsStatus; statusText: string; taxType?: string } | null>(null);
  const [ntsVerifiedFor, setNtsVerifiedFor] = useState<string>('');

  // OCR 자동인식으로 채워진 필드 추적
  const [ocrFilled, setOcrFilled] = useState(false);
  const [ocrFields, setOcrFields] = useState<Set<string>>(new Set());
  // 개업연월일 (OCR에서만 추출, 읽기전용 표시)
  const [openDate, setOpenDate] = useState<string | null>(null);

  const resetForm = () => {
    setBusinessNumber('');
    setRepresentative('');
    setBusinessType('');
    setBusinessCategory('');
    setTaxInvoiceEmail('');
    setPostalCode('');
    setAddress('');
    setAddressDetail('');
    setPracticalManagerName('');
    setPracticalManagerPhone('');
    setApprovalManagerName('');
    setApprovalManagerPhone('');
    setCertUploadKey(null);
    setCertFileName(null);
    setError(null);
    setDone(false);
    setNtsResult(null);
    setNtsVerifiedFor('');
    setOcrFilled(false);
    setOcrFields(new Set());
    setOpenDate(null);
    analyzeCert.reset();
    verifyStatus.reset();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  // OCR로 채워진 필드를 사용자가 직접 수정하면 파란색 표시 제거
  const clearOcrField = (name: string) => {
    setOcrFields((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  /**
   * 입력 필드의 스타일 클래스를 반환한다.
   * - OCR 자동입력: 파란색 배경 (확인 권장)
   * - 빈 필수 항목: 노란 점선 테두리 (입력 유도)
   * - 빈 선택 항목: 일반
   * - 사용자 직접 입력: 일반
   */
  const fieldCls = (name: string, value: string, required = false) => {
    const base = 'h-9 text-[14px] font-normal';
    if (ocrFields.has(name)) {
      // OCR 자동입력 — 파란색
      return `${base} bg-blue-50 border-blue-300 text-blue-900 focus:border-blue-400`;
    }
    if (required && !value.trim()) {
      // 빈 필수 항목 — 노란 점선
      return `${base} border-dashed border-amber-400 bg-amber-50/40 placeholder:text-amber-600`;
    }
    return base;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    const ext = file.name.toLowerCase().match(/\.(pdf|jpe?g|png)$/);
    if (!ext) {
      setError('PDF, JPG, PNG 파일만 첨부할 수 있습니다.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    // 1) 파일 업로드
    let uploadKey: string;
    try {
      const res = await uploadCert.mutateAsync(file);
      uploadKey = res.uploadKey;
      setCertUploadKey(uploadKey);
      setCertFileName(file.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '파일 업로드에 실패했습니다.');
      setCertUploadKey(null);
      setCertFileName(null);
      return;
    }

    // 2) OCR 자동 인식 (업로드 직후 자동 실행)
    setOcrFilled(false);
    setOcrFields(new Set());
    try {
      const ocr = await analyzeCert.mutateAsync(uploadKey);
      const filled = new Set<string>();
      if (ocr.businessNumber && !businessNumber) {
        setBusinessNumber(formatBusinessNumber(ocr.businessNumber.replace(/\D/g, '')));
        filled.add('businessNumber');
      }
      if (ocr.representative && !representative) {
        setRepresentative(ocr.representative);
        filled.add('representative');
      }
      if (ocr.businessType && !businessType) {
        setBusinessType(ocr.businessType);
        filled.add('businessType');
      }
      if (ocr.businessCategory && !businessCategory) {
        setBusinessCategory(ocr.businessCategory);
        filled.add('businessCategory');
      }
      if (ocr.address && !address) {
        setAddress(ocr.address);
        filled.add('address');
      }
      if (ocr.postalCode && !postalCode) {
        setPostalCode(ocr.postalCode);
        filled.add('postalCode');
      }
      // 개업연월일 (표시용, 폼 제출에는 미포함)
      if (ocr.openDate) setOpenDate(ocr.openDate);

      if (filled.size > 0) {
        setOcrFields(filled);
        setOcrFilled(true);
      }

      // OCR로 사업자번호가 인식됐으면 국세청 상태 자동 조회
      if (ocr.businessNumber) {
        try {
          const nts = await verifyStatus.mutateAsync(ocr.businessNumber);
          setNtsResult(nts);
          setNtsVerifiedFor(formatBusinessNumber(ocr.businessNumber.replace(/\D/g, '')));
        } catch {
          // NTS 미설정이거나 조회 실패 시 무시 (수동 확인 버튼으로 재시도 가능)
        }
      }
    } catch {
      // OCR 실패는 사용자 입력으로 대체 — 에러 표시 없음 (서비스 미설정 가능)
    }
  };

  const handleVerifyNts = async () => {
    const bno = businessNumber.replace(/\D/g, '');
    if (bno.length !== 10) {
      setError('사업자등록번호 10자리를 먼저 입력해 주세요.');
      return;
    }
    setError(null);
    try {
      const result = await verifyStatus.mutateAsync(businessNumber);
      setNtsResult(result);
      setNtsVerifiedFor(businessNumber);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('503') || msg.includes('설정되지')) {
        setError('국세청 연동이 아직 설정되지 않았습니다. 관리자에게 문의하세요.');
      } else {
        setError(msg || '국세청 조회에 실패했습니다.');
      }
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!businessNumber.trim() || businessNumber.replace(/\D/g, '').length !== 10) {
      setError('사업자등록번호 10자리를 정확히 입력해 주세요.');
      return;
    }
    if (!representative.trim()) {
      setError('대표자명을 입력해 주세요.');
      return;
    }
    if (!certUploadKey) {
      setError('사업자등록증 파일을 첨부해 주세요.');
      return;
    }
    try {
      await submitUpgrade.mutateAsync({
        businessNumber: businessNumber.trim(),
        representative: representative.trim(),
        businessType: businessType.trim() || undefined,
        businessCategory: businessCategory.trim() || undefined,
        taxInvoiceEmail: taxInvoiceEmail.trim() || undefined,
        postalCode: postalCode || undefined,
        address: address || undefined,
        addressDetail: addressDetail.trim() || undefined,
        practicalManagerName: practicalManagerName.trim() || undefined,
        practicalManagerPhone: practicalManagerPhone.trim() || undefined,
        approvalManagerName: approvalManagerName.trim() || undefined,
        approvalManagerPhone: approvalManagerPhone.trim() || undefined,
        certUploadKey,
      });
      setDone(true);
      onSubmitted?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '신청에 실패했습니다.';
      if (message.includes('409') || message.includes('대기')) {
        setError('이미 승인 대기 중인 신청이 있습니다.');
      } else if (message.includes('400') || message.includes('사업자')) {
        setError('이미 사업자 회원입니다.');
      } else {
        setError(message);
      }
    }
  };

  const isOcrRunning = uploadCert.isPending || analyzeCert.isPending;
  // NTS 상태가 바뀐 사업자번호면 결과 초기화
  const ntsValid = ntsResult && ntsVerifiedFor === businessNumber;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[18px] text-black font-bold">사업자 회원 전환 신청</DialogTitle>
          <DialogDescription className="text-[14px] text-black font-normal">
            세금계산서 발행을 위해 사업자 정보를 등록합니다. 관리자 검토 후 승인됩니다.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <p className="text-[16px] text-black font-medium">신청이 접수되었습니다.</p>
            <p className="text-[14px] text-gray-600 font-normal">관리자 검토 후 승인되면 사업자 회원으로 전환됩니다.</p>
            <Button className="mt-2" onClick={() => handleOpenChange(false)}>확인</Button>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {error && (
              <div className="flex items-start gap-2 p-3 text-[13px] text-red-800 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* 범례 — OCR 인식 후에만 표시 */}
            {ocrFilled && (
              <div className="flex items-center gap-3 text-[12px] text-gray-500 px-1">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" />
                  자동 인식된 항목 (내용 확인 권장)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-amber-50 border border-dashed border-amber-400" />
                  직접 입력 필요
                </span>
              </div>
            )}

            {/* 사업자등록증 첨부 — 폼 최상단으로 이동 (업로드 즉시 OCR 자동 인식) */}
            <div className="space-y-1.5">
              <Label className="text-[14px] font-normal text-gray-600">
                사업자등록증 첨부 <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-[14px] cursor-pointer">
                  {isOcrRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4" />
                  )}
                  파일 선택
                  <input
                    type="file"
                    accept={ACCEPTED}
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isOcrRunning}
                  />
                </label>
                {certFileName && (
                  <span className="inline-flex items-center gap-1 text-[13px] text-green-700">
                    <Paperclip className="h-3.5 w-3.5" />
                    {certFileName}
                  </span>
                )}
              </div>
              {/* OCR 상태 표시 */}
              {analyzeCert.isPending && (
                <p className="text-[12px] text-blue-600 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  사업자등록증 정보를 자동 인식 중입니다...
                </p>
              )}
              {ocrFilled && !analyzeCert.isPending && (
                <p className="text-[12px] text-green-600 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  정보를 자동으로 채웠습니다. 내용을 확인하고 수정해 주세요.
                </p>
              )}
              <p className="text-[12px] text-gray-400">PDF, JPG, PNG / 최대 10MB</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 사업자등록번호 + 국세청 확인 */}
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">
                  사업자등록번호 <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    className={`${fieldCls('businessNumber', businessNumber, true)} flex-1 min-w-0`}
                    value={businessNumber}
                    onChange={(e) => {
                      clearOcrField('businessNumber');
                      setBusinessNumber(formatBusinessNumber(e.target.value));
                      setNtsResult(null);
                    }}
                    placeholder="000-00-00000"
                    maxLength={12}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2 shrink-0"
                    onClick={handleVerifyNts}
                    disabled={verifyStatus.isPending || businessNumber.replace(/\D/g, '').length !== 10}
                    title="국세청에서 사업자 상태 확인"
                  >
                    {verifyStatus.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                {/* 국세청 상태 + 개업연월일 */}
                {(ntsValid || openDate) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {ntsValid && (
                      <>
                        <NtsStatusBadge status={ntsResult.status} statusText={ntsResult.statusText} />
                        {ntsResult.taxType && (
                          <span className="text-[11px] text-gray-500">{ntsResult.taxType}</span>
                        )}
                      </>
                    )}
                    {openDate && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        <CalendarDays className="h-3 w-3" />
                        개업 {openDate}
                      </span>
                    )}
                  </div>
                )}
                {verifyStatus.isPending && (
                  <p className="text-[11px] text-blue-500 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    국세청 조회 중...
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">
                  대표자명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  className={fieldCls('representative', representative, true)}
                  value={representative}
                  onChange={(e) => { clearOcrField('representative'); setRepresentative(e.target.value); }}
                  placeholder="대표자명"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">업태 (선택)</Label>
                <Input
                  className={fieldCls('businessType', businessType)}
                  value={businessType}
                  onChange={(e) => { clearOcrField('businessType'); setBusinessType(e.target.value); }}
                  placeholder="예: 서비스업"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">종목 (선택)</Label>
                <Input
                  className={fieldCls('businessCategory', businessCategory)}
                  value={businessCategory}
                  onChange={(e) => { clearOcrField('businessCategory'); setBusinessCategory(e.target.value); }}
                  placeholder="예: 사진촬영업"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[14px] font-normal text-gray-600">세금계산서 수신 이메일 (선택)</Label>
              <Input
                type="email"
                className={fieldCls('taxInvoiceEmail', taxInvoiceEmail)}
                value={taxInvoiceEmail}
                onChange={(e) => setTaxInvoiceEmail(e.target.value)}
                placeholder="tax@example.com"
              />
            </div>

            <DaumAddressFields
              label="사업장 주소 (선택)"
              postalCode={postalCode}
              address={address}
              addressDetail={addressDetail}
              onComplete={(data) => {
                clearOcrField('postalCode');
                clearOcrField('address');
                setPostalCode(data.postalCode);
                setAddress(data.address);
              }}
              onAddressDetailChange={setAddressDetail}
              postalCodeClassName={ocrFields.has('postalCode') ? 'bg-blue-50 border-blue-300 text-blue-900' : undefined}
              addressClassName={ocrFields.has('address') ? 'bg-blue-50 border-blue-300 text-blue-900' : undefined}
              detailPlaceholder="상세주소 (선택)"
            />

            <div className="space-y-2 pt-1">
              <p className="text-[13px] font-medium text-gray-700">담당자 정보 (선택)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[14px] font-normal text-gray-600">실무담당자 이름</Label>
                  <Input
                    className={fieldCls('practicalManagerName', practicalManagerName)}
                    value={practicalManagerName}
                    onChange={(e) => setPracticalManagerName(e.target.value)}
                    placeholder="이름"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[14px] font-normal text-gray-600">실무담당자 연락처</Label>
                  <Input
                    className={fieldCls('practicalManagerPhone', practicalManagerPhone)}
                    value={practicalManagerPhone}
                    onChange={(e) => setPracticalManagerPhone(formatPhone(e.target.value))}
                    placeholder="010-0000-0000"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[14px] font-normal text-gray-600">결재담당자 이름</Label>
                  <Input
                    className={fieldCls('approvalManagerName', approvalManagerName)}
                    value={approvalManagerName}
                    onChange={(e) => setApprovalManagerName(e.target.value)}
                    placeholder="이름"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[14px] font-normal text-gray-600">결재담당자 연락처</Label>
                  <Input
                    className={fieldCls('approvalManagerPhone', approvalManagerPhone)}
                    value={approvalManagerPhone}
                    onChange={(e) => setApprovalManagerPhone(formatPhone(e.target.value))}
                    placeholder="010-0000-0000"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!done && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitUpgrade.isPending}>
              취소
            </Button>
            <Button
              className="bg-[#E4007F] hover:bg-[#C5006D] text-white"
              onClick={handleSubmit}
              disabled={submitUpgrade.isPending || isOcrRunning}
            >
              {submitUpgrade.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              신청하기
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

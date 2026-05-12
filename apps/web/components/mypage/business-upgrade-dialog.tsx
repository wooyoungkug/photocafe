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
import { AddressSearch } from '@/components/address-search';
import { AlertCircle, CheckCircle2, FileUp, Loader2, Paperclip } from 'lucide-react';
import {
  useSubmitBusinessUpgrade,
  useUploadBusinessCert,
} from '@/hooks/use-business-upgrade';

function formatBusinessNumber(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 10);
  if (nums.length > 5) return `${nums.slice(0, 3)}-${nums.slice(3, 5)}-${nums.slice(5)}`;
  if (nums.length > 3) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return nums;
}

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const MAX_SIZE = 10 * 1024 * 1024;

interface Props {
  /** 다이얼로그 트리거 버튼 (없으면 children 사용) */
  children?: React.ReactNode;
  /** 제출 성공 시 콜백 */
  onSubmitted?: () => void;
}

export function BusinessUpgradeDialog({ children, onSubmitted }: Props) {
  const [open, setOpen] = useState(false);

  const uploadCert = useUploadBusinessCert();
  const submitUpgrade = useSubmitBusinessUpgrade();

  const [businessNumber, setBusinessNumber] = useState('');
  const [representative, setRepresentative] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [taxInvoiceEmail, setTaxInvoiceEmail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [addressEmbedOpen, setAddressEmbedOpen] = useState(false);

  const [certUploadKey, setCertUploadKey] = useState<string | null>(null);
  const [certFileName, setCertFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const resetForm = () => {
    setBusinessNumber('');
    setRepresentative('');
    setBusinessType('');
    setBusinessCategory('');
    setTaxInvoiceEmail('');
    setPostalCode('');
    setAddress('');
    setAddressDetail('');
    setAddressEmbedOpen(false);
    setCertUploadKey(null);
    setCertFileName(null);
    setError(null);
    setDone(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
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
    try {
      const res = await uploadCert.mutateAsync(file);
      setCertUploadKey(res.uploadKey);
      setCertFileName(file.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '파일 업로드에 실패했습니다.');
      setCertUploadKey(null);
      setCertFileName(null);
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

  const inputCls = 'h-9 text-[14px] font-normal';

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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">
                  사업자등록번호 <span className="text-red-500">*</span>
                </Label>
                <Input
                  className={inputCls}
                  value={businessNumber}
                  onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
                  placeholder="000-00-00000"
                  maxLength={12}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">
                  대표자명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  className={inputCls}
                  value={representative}
                  onChange={(e) => setRepresentative(e.target.value)}
                  placeholder="대표자명"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">업태 (선택)</Label>
                <Input
                  className={inputCls}
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="예: 서비스업"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">종목 (선택)</Label>
                <Input
                  className={inputCls}
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  placeholder="예: 사진촬영업"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[14px] font-normal text-gray-600">세금계산서 수신 이메일 (선택)</Label>
              <Input
                type="email"
                className={inputCls}
                value={taxInvoiceEmail}
                onChange={(e) => setTaxInvoiceEmail(e.target.value)}
                placeholder="tax@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[14px] font-normal text-gray-600">사업장 주소 (선택)</Label>
              <AddressSearch
                inline
                isOpen={addressEmbedOpen}
                onOpenChange={setAddressEmbedOpen}
                size="sm"
                className="h-9 text-[14px]"
                onComplete={(data) => {
                  setPostalCode(data.postalCode);
                  setAddress(data.address);
                }}
              />
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <Input className={inputCls} value={postalCode} readOnly placeholder="우편번호" />
                <Input className={inputCls} value={address} readOnly placeholder="주소 검색을 이용하세요" />
              </div>
              <Input
                className={inputCls}
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="상세주소 (선택)"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[14px] font-normal text-gray-600">
                사업자등록증 첨부 <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-[14px] cursor-pointer">
                  {uploadCert.isPending ? (
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
                    disabled={uploadCert.isPending}
                  />
                </label>
                {certFileName && (
                  <span className="inline-flex items-center gap-1 text-[13px] text-green-700">
                    <Paperclip className="h-3.5 w-3.5" />
                    {certFileName}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-gray-400">PDF, JPG, PNG / 최대 10MB</p>
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
              disabled={submitUpgrade.isPending || uploadCert.isPending}
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

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import ImpositionPreviewCanvas from '@/components/imposition/ImpositionPreviewCanvas';
import {
  useImpositionCalculate,
  useCreateImpositionPreset,
  useFindOrCreateImpositionPreset,
  useRunImposition,
  useDownloadImpositionJdf,
  useDownloadImpositionPdf,
  useDownloadImpositionImagePdf,
  useDownloadImpositionBatchZip,
  CalculateImpositionRequest,
  ImpositionResult,
} from '@/hooks/use-imposition';
import { downloadImpositionViaAgent, checkPrintAgentRunning } from '@/hooks/use-print-pdf';
import { usePdfSettings } from './PdfSettingsDialog';

type ImpositionSeed = {
  orderId: string;
  orderItemId: string;
  productWidth?: number;
  productHeight?: number;
  /** 표시 단위 힌트 (mm | inch). 앨범 주문은 보통 inch. 미지정 시 mm */
  productUnit?: 'mm' | 'inch';
  pageCount?: number;
  bindingType?: 'compressed' | 'tack' | 'perfect' | 'flat';
  /** 표시용 라벨 (배치 진행 상태에 사용) */
  label?: string;
  /** 원본 size 문자열 (예: "8×11인치") — bleed 자동 lookup 용 */
  productSize?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 기본값 힌트: 선택된 주문 항목으로부터. 미리보기/설정은 이 항목 기준 */
  seed?: ImpositionSeed;
  /** 다중 선택 시 같은 설정으로 일괄 처리할 추가 항목 목록 */
  additionalSeeds?: ImpositionSeed[];
}

const SHEET_PRESETS = [
  { key: '7900', label: '7900 (330×482)', w: 330, h: 482 },
  { key: '7900S', label: '7900 (315×467)', w: 315, h: 467 },
  { key: 'custom', label: '커스텀', w: 0, h: 0 },
] as const;

type SheetKey = typeof SHEET_PRESETS[number]['key'];

// 제품(앨범) 규격 프리셋 — inch 값은 UI 편의용, 내부는 mm 저장
type ProductPreset = { key: string; label: string; w: number; h: number; unit: 'mm' | 'inch'; group: string };
const IN = 25.4;
const mkInch = (w: number, h: number, group: string): ProductPreset => ({
  key: `${group}-${w}x${h}`,
  label: `${w}×${h}"`,
  w: w * IN,
  h: h * IN,
  unit: 'inch',
  group,
});
// 인디고 7900 (330×482) / 7900S (315×467) 기준 실제 제작되는 한국 웨딩·포토 앨범 규격만 포함
const PRODUCT_PRESETS: ProductPreset[] = [
  // 정사각 — 인디고 시트에 앉는 범위
  mkInch(6, 6, '정사각'),
  mkInch(8, 8, '정사각'),
  mkInch(10, 10, '정사각'),
  mkInch(11, 11, '정사각'),
  mkInch(12, 12, '정사각'),
  // 세로 (W < H) — 웨딩/포토 앨범 표준
  mkInch(5, 7, '세로'),
  mkInch(6, 8, '세로'),
  mkInch(7, 10, '세로'),
  mkInch(8, 10, '세로'),
  mkInch(8, 12, '세로'),
  mkInch(10, 12, '세로'),
  mkInch(11, 14, '세로'),
  mkInch(12, 15, '세로'),
  // 가로 (W > H)
  mkInch(7, 5, '가로'),
  mkInch(7, 5.5, '가로'),
  mkInch(8, 6, '가로'),
  mkInch(10, 7, '가로'),
  mkInch(10, 8, '가로'),
  mkInch(12, 8, '가로'),
  mkInch(12, 10, '가로'),
  mkInch(14, 11, '가로'),
  mkInch(15, 12, '가로'),
  // 커스텀
  { key: 'custom', label: '커스텀 (직접 입력)', w: 0, h: 0, unit: 'mm', group: '기타' },
];
const PRODUCT_GROUPS = ['정사각', '세로', '가로', '기타'];

// ==== 자동 임포지션 규칙 ====
// 제본방식 + 제품규격(mm) 기반으로 시트/여백/갭/오시/타카 등 전체 설정을 규칙 기반으로 산출.
// 시트 선택: 7900S(315×467)와 7900(330×482) 중 Nup yield가 더 큰 쪽 선택 (동률이면 7900S 선호 — 시트비 낮음).
interface AutoSettings {
  bindingTab: 'compressed' | 'tack' | 'perfect';
  sheetKey: SheetKey;
  sheetW: number;
  sheetH: number;
  marginT: number;
  marginR: number;
  marginB: number;
  marginL: number;
  gutter: number;
  rotationPolicy: '0' | '90' | 'auto';
  creaseWidth: number;
  tackMargin: number;
  tackEdge: 'left' | 'right' | 'top' | 'bottom';
}

function computeAutoImposition(seed?: Props['seed']): AutoSettings {
  const bindingTab: AutoSettings['bindingTab'] =
    seed?.bindingType === 'tack' ? 'tack'
      : seed?.bindingType === 'perfect' ? 'perfect'
      : 'compressed';

  // Indigo 7900 기본 여백 (물림/비물림쪽 8.5/2.5mm)
  const marginT = 8.5, marginR = 2.5, marginB = 8.5, marginL = 2.5;
  const gutter = 3;

  return {
    bindingTab,
    sheetKey: '7900S',
    sheetW: 315,
    sheetH: 467,
    marginT, marginR, marginB, marginL,
    gutter,
    rotationPolicy: 'auto',
    creaseWidth: 0,
    tackMargin: 12,
    tackEdge: 'left',
  };
}

// 제품 규격(mm)이 PRODUCT_PRESETS 항목과 1mm 오차 이내로 매칭되면 해당 키 반환, 아니면 'custom'
function findProductPresetKey(productW_mm: number, productH_mm: number): string {
  const found = PRODUCT_PRESETS.find(
    (p) =>
      p.key !== 'custom' &&
      Math.abs(p.w - productW_mm) < 1 &&
      Math.abs(p.h - productH_mm) < 1,
  );
  return found?.key ?? 'custom';
}

export default function ImpositionSettingsDialog({ open, onOpenChange, seed, additionalSeeds }: Props) {
  // ==== 상태 ====
  const [bindingTab, setBindingTab] = useState<'compressed' | 'tack' | 'perfect'>(
    seed?.bindingType === 'tack' ? 'tack'
      : seed?.bindingType === 'perfect' ? 'perfect'
      : 'compressed',
  );
  const [sheetKey, setSheetKey] = useState<SheetKey>('7900S');
  const [sheetW, setSheetW] = useState<number>(315);
  const [sheetH, setSheetH] = useState<number>(467);

  const [productW, setProductW] = useState<number>(seed?.productWidth ?? 210);
  const [productH, setProductH] = useState<number>(seed?.productHeight ?? 297);
  const [pageCount, setPageCount] = useState<number>(seed?.pageCount ?? 20);
  const [productUnit, setProductUnit] = useState<'mm' | 'inch'>('inch');
  const [productPresetKey, setProductPresetKey] = useState<string>('custom');
  const MM_PER_INCH = 25.4;
  const toDisplay = (mm: number) =>
    productUnit === 'inch' ? Math.round((mm / MM_PER_INCH) * 100) / 100 : Math.round(mm * 100) / 100;
  const fromDisplay = (val: number) => (productUnit === 'inch' ? val * MM_PER_INCH : val);

  const [marginT, setMarginT] = useState(8.5);
  const [marginR, setMarginR] = useState(2.5);
  const [marginB, setMarginB] = useState(8.5);
  const [marginL, setMarginL] = useState(2.5);

  const [bleed, setBleed] = useState(0);
  const [gutter, setGutter] = useState(3);
  const [rotationPolicy, setRotationPolicy] = useState<'0' | '90' | 'auto'>('auto');
  const [manualNup, setManualNup] = useState<number | ''>('');
  const [centerAlign, setCenterAlign] = useState(false);
  const [noGutter, setNoGutter] = useState(false);

  // 압축앨범
  const [creaseWidth, setCreaseWidth] = useState(0);
  const [creaseStyle, setCreaseStyle] = useState<'dashed' | 'solid'>('dashed');
  const [creaseDepth, setCreaseDepth] = useState(0.3);

  // 타카
  const [tackMargin, setTackMargin] = useState(12);
  const [tackEdge, setTackEdge] = useState<'left' | 'right' | 'top' | 'bottom'>('left');

  // 마크 — 초기값은 시스템 설정의 "임포지션 기본 마크"를 사용. 설정 로드 전엔 true.
  const pdfSettings = usePdfSettings();
  const [showCrop, setShowCrop] = useState(true);
  const [showBleed, setShowBleed] = useState(true);
  const [showReg, setShowReg] = useState(true);
  const [showColorBar, setShowColorBar] = useState(true);
  const [showJobMeta, setShowJobMeta] = useState(true);
  const [showFold, setShowFold] = useState(true);

  // 설정 로드 완료 시 마크 기본값 반영 (다이얼로그 오픈 때만 한 번씩)
  useEffect(() => {
    if (!open || !pdfSettings.isLoaded) return;
    setShowCrop(pdfSettings.markCrop);
    setShowBleed(pdfSettings.markBleed);
    setShowReg(pdfSettings.markRegistration);
    setShowColorBar(pdfSettings.markColorBar);
    setShowFold(pdfSettings.markFold);
    setShowJobMeta(pdfSettings.markJobMeta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pdfSettings.isLoaded]);

  // 자동설정 적용 여부 (사용자가 이후 수정해도 표시 유지)
  const [autoApplied, setAutoApplied] = useState(false);

  // 프리뷰
  const [result, setResult] = useState<ImpositionResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);

  // ==== 훅 ====
  const calcMut = useImpositionCalculate();
  const createPresetMut = useCreateImpositionPreset();
  const findOrCreatePresetMut = useFindOrCreateImpositionPreset();
  const runMut = useRunImposition();
  const dlJdf = useDownloadImpositionJdf();
  const dlPdf = useDownloadImpositionPdf();
  const dlImagePdf = useDownloadImpositionImagePdf();
  const dlBatchZip = useDownloadImpositionBatchZip();

  // 자동 임포지션 적용: seed(제본/규격/페이지)로부터 시트·여백·Nup·오시·타카까지 규칙 기반 자동 산출.
  // 다이얼로그 오픈 또는 대상 항목 변경 시에만 실행 → 사용자의 이후 미세조정은 덮어쓰지 않음.
  const applyAuto = () => {
    const pW = seed?.productWidth;
    const pH = seed?.productHeight;
    if (pW) setProductW(pW);
    if (pH) setProductH(pH);
    if (seed?.productUnit === 'inch' || seed?.productUnit === 'mm') {
      setProductUnit(seed.productUnit);
    }
    if (seed?.pageCount) setPageCount(seed.pageCount);

    // 규격 프리셋 키 매칭 (있으면 드롭다운도 해당 항목으로)
    if (pW && pH) {
      setProductPresetKey(findProductPresetKey(pW, pH));
    }

    const auto = computeAutoImposition(seed);
    setBindingTab(auto.bindingTab);
    setSheetKey(auto.sheetKey);
    setSheetW(auto.sheetW);
    setSheetH(auto.sheetH);
    setMarginT(auto.marginT);
    setMarginR(auto.marginR);
    setMarginB(auto.marginB);
    setMarginL(auto.marginL);
    setGutter(auto.gutter);
    setRotationPolicy(auto.rotationPolicy);
    setCreaseWidth(auto.creaseWidth);
    setTackMargin(auto.tackMargin);
    setTackEdge(auto.tackEdge);
    setManualNup('');
    setAutoApplied(true);
  };

  useEffect(() => {
    if (!open) return;
    applyAuto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed?.orderItemId, seed?.productWidth, seed?.productHeight, seed?.productUnit, seed?.pageCount, seed?.bindingType]);

  // 시스템 설정의 "기본 블리드 크기" 를 bleed 단일 출처로 사용.
  // 다이얼로그 오픈 + 설정 로드 완료 시 1회 적용. 사용자가 이후 입력으로 덮어쓰면 그 값을 유지.
  useEffect(() => {
    if (!open || !pdfSettings.isLoaded) return;
    if (autoApplied) {
      setBleed(pdfSettings.bleedSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pdfSettings.isLoaded, autoApplied]);

  // ==== 요청 payload ====
  const payload: CalculateImpositionRequest = useMemo(() => ({
    productWidth: productW,
    productHeight: productH,
    pageCount,
    bindingType: bindingTab,
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    marginTop: marginT,
    marginRight: marginR,
    marginBottom: marginB,
    marginLeft: marginL,
    bleed,
    gutter,
    rotationPolicy,
    grainDirection: 'short',
    creaseWidth: bindingTab === 'compressed' ? creaseWidth : undefined,
    tackMargin: bindingTab === 'tack' ? tackMargin : undefined,
    tackEdge: bindingTab === 'tack' ? tackEdge : undefined,
    manualNup: manualNup === '' ? undefined : Number(manualNup),
    centerAlign,
    noGutter,
  }), [
    productW, productH, pageCount, bindingTab, sheetW, sheetH,
    marginT, marginR, marginB, marginL,
    bleed, gutter, rotationPolicy,
    creaseWidth, tackMargin, tackEdge, manualNup,
    centerAlign, noGutter,
  ]);

  // ==== debounce 150ms 자동 재계산 ====
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      calcMut.mutate(payload, {
        onSuccess: (r) => {
          setResult(r);
          setCalcError(null);
          if (sheetIndex >= r.sheets.length) setSheetIndex(0);
        },
        onError: (e: any) => {
          setResult(null);
          const msg = e?.response?.data?.message || e?.message || '계산 실패';
          setCalcError(Array.isArray(msg) ? msg.join(', ') : String(msg));
        },
      });
    }, 150);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payload]);

  // ==== 시트 프리셋 변경 ====
  const onSheetKeyChange = (k: SheetKey) => {
    setSheetKey(k);
    const p = SHEET_PRESETS.find((s) => s.key === k)!;
    if (k !== 'custom') {
      setSheetW(p.w);
      setSheetH(p.h);
    }
  };

  // ==== 프리셋 저장 ====
  const onSavePreset = () => {
    const name = window.prompt('프리셋 이름을 입력하세요', `${bindingTab} ${sheetW}×${sheetH}`);
    if (!name) return;
    createPresetMut.mutate(
      {
        name,
        bindingType: bindingTab,
        sheetWidth: sheetW,
        sheetHeight: sheetH,
        marginTop: marginT,
        marginRight: marginR,
        marginBottom: marginB,
        marginLeft: marginL,
        gutter,
        bleed,
        creaseWidth: bindingTab === 'compressed' ? creaseWidth : null,
        tackMargin: bindingTab === 'tack' ? tackMargin : null,
        tackEdge: bindingTab === 'tack' ? tackEdge : null,
        grainDirection: 'short',
        rotationPolicy,
        isDefault: false,
      } as any,
      {
        onSuccess: () => toast.success('프리셋이 저장되었습니다.'),
        onError: (e) => toast.error(`저장 실패: ${e.message}`),
      },
    );
  };

  // ==== 실행 (JDF+PDF 생성) ====
  // 현재 폼(자동 산출값 + 사용자 미세조정 반영) 으로 임시 프리셋을 생성한 뒤 실행.
  // 임시 프리셋은 이름 prefix `_즉시_` 로 저장되어 필요 시 식별/삭제 가능.
  const onRun = async () => {
    if (!seed?.orderId || !seed?.orderItemId) {
      toast.error('주문/항목 정보가 없습니다. 행에서 [임포지션]을 눌러주세요.');
      return;
    }

    let presetIdToUse: string;
    try {
      // 동일 파라미터의 _즉시_ 프리셋이 있으면 재사용 (없으면 신규 생성).
      // name 은 신규 생성 시에만 사용되므로 파라미터 기반으로 안정적인 값을 부여.
      const created = await findOrCreatePresetMut.mutateAsync({
        name: `_즉시_${bindingTab}_${sheetW}x${sheetH}`,
        bindingType: bindingTab,
        sheetWidth: sheetW,
        sheetHeight: sheetH,
        marginTop: marginT,
        marginRight: marginR,
        marginBottom: marginB,
        marginLeft: marginL,
        gutter,
        bleed,
        creaseWidth: bindingTab === 'compressed' ? creaseWidth : null,
        tackMargin: bindingTab === 'tack' ? tackMargin : null,
        tackEdge: bindingTab === 'tack' ? tackEdge : null,
        grainDirection: 'short',
        rotationPolicy,
        isDefault: false,
      } as any);
      presetIdToUse = created.id;
    } catch (e: any) {
      toast.error(`임시 프리셋 생성 실패: ${e.message}`);
      return;
    }

    // 다중 선택 시 같은 설정으로 일괄 실행 (순차 — 서버 부하/UX 안정성).
    const targets: ImpositionSeed[] = [seed, ...(additionalSeeds ?? [])];
    const total = targets.length;
    const marks = {
      crop: showCrop,
      bleed: showBleed,
      registration: showReg,
      colorBar: showColorBar,
      jobMeta: showJobMeta,
      fold: showFold,
    };
    const manualNupValue = manualNup === '' ? undefined : Number(manualNup);

    let succeeded = 0;
    const failed: { label: string; error: string }[] = [];
    const succeededJobs: {
      id: string;
      pdfPath?: string | null;
      imagePdfPath?: string | null;
      autoSaved?: boolean;
      autoSavedPath?: string | null;
    }[] = [];

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const label = t.label || t.orderItemId.slice(0, 8);
      try {
        const job = await runMut.mutateAsync({
          orderId: t.orderId,
          orderItemId: t.orderItemId,
          presetId: presetIdToUse,
          manualNup: manualNupValue,
          marks,
        });
        succeeded++;
        succeededJobs.push({
          id: job.id,
          pdfPath: job.pdfPath,
          imagePdfPath: job.imagePdfPath,
          autoSaved: job.autoSaved,
          autoSavedPath: job.autoSavedPath,
        });
        if (total > 1) {
          toast.success(`(${i + 1}/${total}) ${label} 생성 완료`);
        }
      } catch (e: any) {
        failed.push({ label, error: e?.message || '알 수 없는 오류' });
      }
    }

    // 다운로드 전략:
    // - 서버 자동저장이 활성화된 경우(모든 성공 작업이 autoSaved=true): 다운로드 트리거 생략
    // - 로컬 에이전트가 실행 중이면: 에이전트가 Railway에서 직접 다운로드 (C:\PDF저장 등 설정된 경로)
    //   → 브라우저 다운로드 폴더 오염 방지
    // - 에이전트 미실행: 기존 방식(개별 파일 또는 ZIP)으로 폴백
    const allAutoSaved = succeededJobs.length > 0 && succeededJobs.every((j) => j.autoSaved);
    let agentSaved = 0;
    let agentTried = false;
    if (!allAutoSaved && succeededJobs.length > 0) {
      const agentRunning = await checkPrintAgentRunning();
      if (agentRunning) {
        agentTried = true;
        // 저장 경로: {YYMMDD}/imposition/
        const today = new Date();
        const yy = String(today.getFullYear()).slice(-2);
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const subPath = `${yy}${mm}${dd}/imposition`;

        for (const job of succeededJobs) {
          const r = await downloadImpositionViaAgent(job.id, subPath);
          if (r.saved > 0 && r.saved === r.requested) agentSaved += 1;
        }
      }

      // 에이전트가 모든 작업을 저장하지 못했으면 기존 방식으로 폴백
      if (agentSaved < succeededJobs.length) {
        if (succeededJobs.length === 1) {
          const job = succeededJobs[0];
          dlJdf.mutate(job.id);
          if (job.pdfPath) {
            setTimeout(() => dlPdf.mutate(job.id), 300);
          }
          if (job.imagePdfPath) {
            setTimeout(() => dlImagePdf.mutate(job.id), 700);
          }
        } else if (succeededJobs.length > 1) {
          dlBatchZip.mutate(succeededJobs.map((j) => j.id));
        }
      }
    }

    if (total === 1) {
      if (succeeded === 1) {
        if (allAutoSaved) {
          toast.success('JDF + PDF 생성 완료 — 설정된 자동저장 폴더에 저장됨');
        } else if (agentTried && agentSaved === succeededJobs.length) {
          toast.success('JDF + PDF 생성 완료 — 에이전트가 C:\\PDF저장 폴더에 저장함');
        } else {
          toast.success('JDF + PDF 생성 완료');
        }
      } else {
        // 사일런트 드랍 방지를 위해 에러는 길게(10초), 본문에 actionable 한 안내까지 표시
        toast.error('JDF + PDF 생성 실패', {
          description: failed[0]?.error || '알 수 없는 오류',
          duration: 10000,
        });
      }
    } else {
      if (failed.length === 0) {
        if (allAutoSaved) {
          toast.success(`${succeeded}건 모두 생성 완료 — 자동저장 폴더에 저장됨`);
        } else if (agentTried && agentSaved === succeededJobs.length) {
          toast.success(`${succeeded}건 모두 생성 완료 — 에이전트가 C:\\PDF저장 폴더에 저장함`);
        } else {
          toast.success(`${succeeded}건 모두 생성 완료 — ZIP 다운로드 시작`);
        }
      } else {
        // 다건 처리: 실패한 항목별로 라벨/사유를 모두 보여줘야 어떤 주문 PDF 를 재생성해야 할지 판단 가능.
        const detail = failed.map((f) => `• ${f.label}: ${f.error}`).join('\n');
        toast.error(`${succeeded}/${total}건 성공, ${failed.length}건 실패`, {
          description: detail,
          duration: 15000,
        });
      }
    }

    // 모든 항목 성공 시 다이얼로그 자동 닫기 — 출력대기 화면으로 즉시 복귀.
    // 부분 실패가 있으면 사용자가 설정 조정/재시도할 수 있도록 다이얼로그 유지.
    if (failed.length === 0 && succeeded > 0) {
      onOpenChange(false);
    }
  };

  const util = result?.utilization ?? 0;
  const utilLow = util > 0 && util < 0.5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-[24px] text-black font-normal">
              인디고 임포지션 설정
              {additionalSeeds && additionalSeeds.length > 0 && (
                <span className="ml-3 text-[14px] text-black font-normal">
                  · 일괄 처리 {1 + additionalSeeds.length}건 (같은 설정 적용)
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2 mr-8">
              {autoApplied && (
                <Badge variant="outline" className="text-[14px] text-black font-normal">
                  자동 설정 적용됨
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={applyAuto}>
                자동 재적용
              </Button>
              <Button variant="outline" size="sm" onClick={onSavePreset}>
                프리셋 저장
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-[420px_1fr] min-h-0 overflow-hidden">
          {/* ==== 좌측 설정 420 ==== */}
          <div className="border-r overflow-y-auto p-5 space-y-5">
            {/* 시트 규격 */}
            <section className="space-y-2">
              <h3 className="text-[18px] text-black font-bold">시트 규격</h3>
              <div className="flex flex-wrap gap-4">
                {SHEET_PRESETS.map((p) => {
                  const disabled = p.key !== '7900S';
                  return (
                    <label
                      key={p.key}
                      className={`flex items-center gap-1.5 text-[14px] font-normal ${
                        disabled
                          ? 'text-gray-300 cursor-not-allowed opacity-50'
                          : 'text-black cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sheetKey"
                        checked={sheetKey === p.key}
                        onChange={() => !disabled && onSheetKeyChange(p.key)}
                        disabled={disabled}
                      />
                      {p.key === 'custom' ? '커스텀' : p.label}
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-[14px] text-black font-normal">W (mm)</Label>
                  <Input
                    type="number"
                    value={sheetW}
                    onChange={(e) => setSheetW(Number(e.target.value))}
                    disabled={sheetKey !== 'custom'}
                    className="h-9 text-[14px]"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-[14px] text-black font-normal">H (mm)</Label>
                  <Input
                    type="number"
                    value={sheetH}
                    onChange={(e) => setSheetH(Number(e.target.value))}
                    disabled={sheetKey !== 'custom'}
                    className="h-9 text-[14px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'T', value: marginT, setter: setMarginT },
                  { label: 'R', value: marginR, setter: setMarginR },
                  { label: 'B', value: marginB, setter: setMarginB },
                  { label: 'L', value: marginL, setter: setMarginL },
                ].map((m) => (
                  <div key={m.label}>
                    <Label className="text-[14px] text-black font-normal">여백 {m.label}</Label>
                    <Input
                      type="number"
                      value={m.value}
                      onChange={(e) => m.setter(Number(e.target.value))}
                      className="h-9 text-[14px]"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 제품 규격 */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] text-black font-bold">제품(앨범) 규격</h3>
                <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setProductUnit('mm')}
                    className={`px-3 h-7 text-[14px] font-normal ${productUnit === 'mm' ? 'bg-black text-white' : 'bg-white text-black'}`}
                  >
                    mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductUnit('inch')}
                    className={`px-3 h-7 text-[14px] font-normal ${productUnit === 'inch' ? 'bg-black text-white' : 'bg-white text-black'}`}
                  >
                    inch
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-[14px] text-black font-normal">규격 프리셋</Label>
                <select
                  aria-label="제품 규격 프리셋"
                  title="제품 규격 프리셋"
                  value={productPresetKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setProductPresetKey(key);
                    const preset = PRODUCT_PRESETS.find((p) => p.key === key);
                    if (preset && preset.key !== 'custom') {
                      setProductW(preset.w);
                      setProductH(preset.h);
                      setProductUnit(preset.unit);
                    }
                  }}
                  className="w-full h-9 text-[14px] text-black font-normal border border-gray-300 rounded-md px-2 bg-white"
                >
                  {PRODUCT_GROUPS.map((group) => (
                    <optgroup key={group} label={group}>
                      {PRODUCT_PRESETS.filter((p) => p.group === group).map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[14px] text-black font-normal">W ({productUnit})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={toDisplay(productW)}
                    onChange={(e) => setProductW(fromDisplay(Number(e.target.value)))}
                    className="h-9 text-[14px]"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">H ({productUnit})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={toDisplay(productH)}
                    onChange={(e) => setProductH(fromDisplay(Number(e.target.value)))}
                    className="h-9 text-[14px]"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">페이지</Label>
                  <Input
                    type="number"
                    value={pageCount}
                    onChange={(e) => setPageCount(Number(e.target.value))}
                    className="h-9 text-[14px]"
                  />
                </div>
              </div>
              {productUnit === 'inch' && (
                <p className="text-[14px] text-black font-normal opacity-60">
                  내부 계산은 mm 기준 (현재: {Math.round(productW * 10) / 10} × {Math.round(productH * 10) / 10} mm)
                </p>
              )}
            </section>

            {/* Nup / 회전 / 갭 */}
            <section className="space-y-2">
              <h3 className="text-[18px] text-black font-bold">Nup & 회전</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[14px] text-black font-normal">Nup (0=자동)</Label>
                  <Input
                    type="number"
                    value={manualNup}
                    onChange={(e) => setManualNup(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="자동"
                    className="h-9 text-[14px]"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">Gutter (mm)</Label>
                  <Input
                    type="number"
                    value={gutter}
                    onChange={(e) => setGutter(Number(e.target.value))}
                    className="h-9 text-[14px]"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                {(['0', '90', 'auto'] as const).map((r) => (
                  <label key={r} className="flex items-center gap-1.5 text-[14px] text-black font-normal cursor-pointer">
                    <input
                      type="radio"
                      name="rotation"
                      checked={rotationPolicy === r}
                      onChange={() => setRotationPolicy(r)}
                    />
                    {r === '0' ? '0° 고정' : r === '90' ? '90° 허용' : '자동'}
                  </label>
                ))}
              </div>
              <div>
                <Label className="text-[14px] text-black font-normal">Bleed (mm)</Label>
                <Input
                  type="number"
                  value={bleed}
                  onChange={(e) => setBleed(Number(e.target.value))}
                  className="h-9 text-[14px]"
                />
              </div>
              {/* 배치 옵션 */}
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-1.5 text-[14px] text-black font-normal cursor-pointer">
                  <Checkbox
                    checked={centerAlign}
                    onCheckedChange={(v) => setCenterAlign(!!v)}
                  />
                  <span>중앙정렬</span>
                  <span className="text-gray-500 text-[12px]">(인쇄영역을 Nup 셀로 나눠 중앙 배치)</span>
                </label>
                <label className="flex items-center gap-1.5 text-[14px] text-black font-normal cursor-pointer">
                  <Checkbox
                    checked={noGutter}
                    onCheckedChange={(v) => setNoGutter(!!v)}
                  />
                  <span>여백없음</span>
                  <span className="text-gray-500 text-[12px]">(gutter=0, 페이지 붙여서 출력)</span>
                </label>
              </div>
            </section>

            {/* 제본방식 탭 */}
            <section className="space-y-3">
              <h3 className="text-[18px] text-black font-bold">제본방식</h3>
              <Tabs value={bindingTab} onValueChange={(v) => setBindingTab(v as any)}>
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="compressed" className="text-[14px]">압축앨범</TabsTrigger>
                  <TabsTrigger value="tack" className="text-[14px]">타카</TabsTrigger>
                  <TabsTrigger value="perfect" className="text-[14px]">화보(무선제본)</TabsTrigger>
                </TabsList>
              </Tabs>

              {bindingTab === 'compressed' && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[14px] text-black font-normal">오시 폭 (mm, 0~5)</Label>
                        <Input
                          type="number"
                          step={0.1}
                          value={creaseWidth}
                          onChange={(e) => setCreaseWidth(Number(e.target.value))}
                          className="h-9 text-[14px]"
                        />
                      </div>
                      <div>
                        <Label className="text-[14px] text-black font-normal">오시 깊이 (mm)</Label>
                        <Input
                          type="number"
                          step={0.1}
                          value={creaseDepth}
                          onChange={(e) => setCreaseDepth(Number(e.target.value))}
                          className="h-9 text-[14px]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {(['dashed', 'solid'] as const).map((s) => (
                        <label key={s} className="flex items-center gap-1.5 text-[14px] text-black font-normal cursor-pointer">
                          <input
                            type="radio"
                            name="creaseStyle"
                            checked={creaseStyle === s}
                            onChange={() => setCreaseStyle(s)}
                          />
                          {s === 'dashed' ? '점선' : '실선'}
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {bindingTab === 'tack' && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <div>
                      <Label className="text-[14px] text-black font-normal">타카 위치</Label>
                      <div className="flex gap-3 mt-1">
                        {(['left', 'right', 'top', 'bottom'] as const).map((e) => (
                          <label key={e} className="flex items-center gap-1.5 text-[14px] text-black font-normal cursor-pointer">
                            <input
                              type="radio"
                              name="tackEdge"
                              checked={tackEdge === e}
                              onChange={() => setTackEdge(e)}
                            />
                            {e === 'left' ? '좌' : e === 'right' ? '우' : e === 'top' ? '상' : '하'}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[14px] text-black font-normal">여백 (mm, 8~20)</Label>
                      <Input
                        type="number"
                        value={tackMargin}
                        min={8}
                        max={20}
                        onChange={(e) => setTackMargin(Number(e.target.value))}
                        className="h-9 text-[14px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {bindingTab === 'perfect' && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-[14px] text-black font-normal">
                      화보 무선제본 모드 — 단면 출력, 순차 페이지네이션 (1)(2)(3)… 으로 시트에 앉힌 뒤 모아서 제본(gather &amp; glue)합니다.
                    </p>
                    <ul className="text-[14px] text-black font-normal list-disc pl-5 space-y-0.5">
                      <li>오시 마크 없음, 타카 여백 없음</li>
                      <li>Nup≥2 이면 시트 자른 뒤 순서대로 모아서 풀제본</li>
                      <li>시그니처 접기(folding) 사용 안 함</li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* 마크 */}
            <section className="space-y-2">
              <h3 className="text-[18px] text-black font-bold">마크</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-[14px] text-black font-normal">
                  <Checkbox checked={showCrop} onCheckedChange={(v) => setShowCrop(!!v)} />
                  재단선
                </label>
                <label className="flex items-center gap-2 text-[14px] text-black font-normal">
                  <Checkbox checked={showBleed} onCheckedChange={(v) => setShowBleed(!!v)} />
                  블리드
                </label>
                <label className="flex items-center gap-2 text-[14px] text-black font-normal">
                  <Checkbox checked={showReg} onCheckedChange={(v) => setShowReg(!!v)} />
                  레지
                </label>
                <label className="flex items-center gap-2 text-[14px] text-black font-normal">
                  <Checkbox checked={showColorBar} onCheckedChange={(v) => setShowColorBar(!!v)} />
                  컬러바
                </label>
                <label className="flex items-center gap-2 text-[14px] text-black font-normal">
                  <Checkbox checked={showFold} onCheckedChange={(v) => setShowFold(!!v)} />
                  중간 재단선 <span className="text-gray-500 text-[12px]">(Nup≥2)</span>
                </label>
                <label className="col-span-2 flex items-center gap-2 text-[14px] text-black font-normal">
                  <Checkbox checked={showJobMeta} onCheckedChange={(v) => setShowJobMeta(!!v)} />
                  JobID/스튜디오명
                </label>
              </div>
            </section>
          </div>

          {/* ==== 우측 프리뷰 760 ==== */}
          <div className="overflow-y-auto p-5 space-y-3 bg-gray-50">
            <div className="flex items-center gap-2">
              {utilLow && (
                <Badge variant="destructive" className="text-[14px]">
                  활용률 {(util * 100).toFixed(1)}% — 시트 낭비 큼
                </Badge>
              )}
              {result && (
                <>
                  <Badge variant="outline" className="text-[14px] text-black font-normal">
                    {result.nup}up · {result.cols}×{result.rows} · {result.rotation}°
                  </Badge>
                  <Badge variant="outline" className="text-[14px] text-black font-normal">
                    시트 {result.sheetCount}장 · 페이지 {result.pageCount}P
                  </Badge>
                </>
              )}
            </div>

            {calcError && (
              <div className="border border-red-300 bg-red-50 text-red-700 rounded-md p-3 text-[14px]">
                계산 오류: {calcError}
              </div>
            )}

            <ImpositionPreviewCanvas result={result} sheetIndex={sheetIndex} />

            {result && result.sheets.length > 1 && (
              <div className="flex items-center gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSheetIndex(Math.max(0, sheetIndex - 1))}
                  disabled={sheetIndex === 0}
                >
                  이전
                </Button>
                <span className="text-[14px] text-black font-normal">
                  {sheetIndex + 1} / {result.sheetCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSheetIndex(Math.min(result.sheetCount - 1, sheetIndex + 1))}
                  disabled={sheetIndex >= result.sheetCount - 1}
                >
                  다음
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t">
          <div className="flex-1 text-[14px] text-black font-normal">
            {seed?.orderItemId
              ? `대상 항목: ${seed.orderItemId}`
              : '주문 항목이 선택되지 않아 저장만 가능합니다.'}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={onRun}
            disabled={
              runMut.isPending ||
              findOrCreatePresetMut.isPending ||
              !seed?.orderItemId
            }
          >
            {runMut.isPending
              ? '생성 중...'
              : findOrCreatePresetMut.isPending
                ? '임시 프리셋 준비 중...'
                : 'JDF + PDF 생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

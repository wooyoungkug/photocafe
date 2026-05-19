'use client';

/**
 * 출력실 통합관리 — PrintRoomPreset 관리 화면 (Phase 7).
 *
 * 기능:
 *  - 전체 프리셋 목록 테이블 (정렬: nup → sizeCode)
 *  - sizeCode 검색 / nup 필터 / 활성여부 필터
 *  - 신규 등록 모달 (NUP 별 자동 그리드 추천 + 수동 조정 + 미니 미리보기)
 *  - 수정 (인라인은 복잡 → 모달 방식)
 *  - 비활성화 (실삭제 대신 isActive=false, 확인 모달)
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Edit2, Plus, PowerOff, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  usePrintRoomPresets,
  useCreatePrintRoomPreset,
  useUpdatePrintRoomPreset,
  useDeactivatePrintRoomPreset,
  type PrintRoomPreset,
} from '@/hooks/use-print-room';

type Orientation = 'portrait' | 'landscape';

const NUP_GRID_DEFAULTS: Record<string, { cols: number; rows: number; orient: Orientation }> = {
  '16up': { cols: 4, rows: 4, orient: 'landscape' },
  '8up': { cols: 4, rows: 2, orient: 'landscape' },
  '4up': { cols: 2, rows: 2, orient: 'landscape' },
  '2up': { cols: 2, rows: 1, orient: 'landscape' },
  '1up': { cols: 1, rows: 1, orient: 'portrait' },
  '1+up': { cols: 1, rows: 1, orient: 'portrait' },
  '1++up': { cols: 1, rows: 1, orient: 'portrait' },
};
const NUP_OPTIONS = Object.keys(NUP_GRID_DEFAULTS);

interface FormState {
  sizeCode: string;
  nup: string;
  paperOrientation: Orientation;
  gridCols: number;
  gridRows: number;
  marginMm: number;
  cropMarkLengthMm: number;
  cropMarkThicknessPt: number;
  cropMarkColor: string;
  pdfVersion: string;
  isActive: boolean;
}

const DEFAULT_FORM: FormState = {
  sizeCode: '',
  nup: '4up',
  paperOrientation: 'landscape',
  gridCols: 2,
  gridRows: 2,
  marginMm: 10,
  cropMarkLengthMm: 5,
  cropMarkThicknessPt: 0.25,
  cropMarkColor: 'K100',
  pdfVersion: '1.4',
  isActive: true,
};

export default function PrintRoomPresetsPage() {
  const t = useTranslations('printRoom.adminPresets');

  // 데이터
  const presetsQuery = usePrintRoomPresets();
  const createMutation = useCreatePrintRoomPreset();
  const updateMutation = useUpdatePrintRoomPreset();
  const deactivateMutation = useDeactivatePrintRoomPreset();

  // 필터/검색
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNup, setFilterNup] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');

  // 모달 상태
  const [createOpen, setCreateOpen] = useState(false);
  const [editPreset, setEditPreset] = useState<PrintRoomPreset | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<PrintRoomPreset | null>(null);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  // 필터 적용
  const filtered = useMemo(() => {
    const list = presetsQuery.data ?? [];
    return list.filter((p) => {
      if (
        searchTerm &&
        !p.sizeCode.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (filterNup !== 'all' && p.nup !== filterNup) return false;
      if (filterActive === 'active' && !p.isActive) return false;
      if (filterActive === 'inactive' && p.isActive) return false;
      return true;
    });
  }, [presetsQuery.data, searchTerm, filterNup, filterActive]);

  // 폼 — NUP 변경 시 자동 추천
  function applyNupDefaults(nup: string, prev: FormState): FormState {
    const d = NUP_GRID_DEFAULTS[nup];
    if (!d) return { ...prev, nup };
    return {
      ...prev,
      nup,
      gridCols: d.cols,
      gridRows: d.rows,
      paperOrientation: d.orient,
    };
  }

  function openCreate() {
    setForm(DEFAULT_FORM);
    setCreateOpen(true);
  }

  function openEdit(preset: PrintRoomPreset) {
    setForm({
      sizeCode: preset.sizeCode,
      nup: preset.nup,
      paperOrientation: preset.paperOrientation,
      gridCols: preset.gridCols,
      gridRows: preset.gridRows,
      marginMm: preset.marginMm,
      cropMarkLengthMm: preset.cropMarkLengthMm,
      cropMarkThicknessPt: preset.cropMarkThicknessPt,
      cropMarkColor: preset.cropMarkColor,
      pdfVersion: preset.pdfVersion,
      isActive: preset.isActive,
    });
    setEditPreset(preset);
  }

  function submitCreate() {
    if (!form.sizeCode.trim() || !form.nup) {
      toast.error(t('toast.requireSizeNup'));
      return;
    }
    createMutation.mutate(
      {
        sizeCode: form.sizeCode.trim(),
        nup: form.nup,
        paperOrientation: form.paperOrientation,
        gridCols: form.gridCols,
        gridRows: form.gridRows,
        marginMm: form.marginMm,
        cropMarkLengthMm: form.cropMarkLengthMm,
        cropMarkThicknessPt: form.cropMarkThicknessPt,
        cropMarkColor: form.cropMarkColor,
        pdfVersion: form.pdfVersion,
        isActive: form.isActive,
      },
      {
        onSuccess: () => {
          toast.success(t('toast.created'));
          setCreateOpen(false);
        },
        onError: (err) => toast.error(err.message || t('toast.createFailed')),
      },
    );
  }

  function submitEdit() {
    if (!editPreset) return;
    updateMutation.mutate(
      {
        id: editPreset.id,
        data: {
          paperOrientation: form.paperOrientation,
          gridCols: form.gridCols,
          gridRows: form.gridRows,
          marginMm: form.marginMm,
          cropMarkLengthMm: form.cropMarkLengthMm,
          cropMarkThicknessPt: form.cropMarkThicknessPt,
          cropMarkColor: form.cropMarkColor,
          pdfVersion: form.pdfVersion,
          isActive: form.isActive,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('toast.updated'));
          setEditPreset(null);
        },
        onError: (err) => toast.error(err.message || t('toast.updateFailed')),
      },
    );
  }

  function submitDeactivate() {
    if (!confirmDeactivate) return;
    deactivateMutation.mutate(confirmDeactivate.id, {
      onSuccess: () => {
        toast.success(t('toast.deactivated'));
        setConfirmDeactivate(null);
      },
      onError: (err) => toast.error(err.message || t('toast.deactivateFailed')),
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 헤더 */}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[24px] text-black font-normal">{t('title')}</h1>
          <p className="text-[14px] text-black font-normal opacity-70 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Button onClick={openCreate} className="h-9 text-[14px] font-normal">
          <Plus className="h-4 w-4 mr-1" />
          {t('action.create')}
        </Button>
      </div>

      {/* 필터 카드 */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 opacity-60" />
              <Input
                placeholder={t('filter.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-[220px] text-[14px] font-normal"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-[14px] text-black font-normal">NUP</Label>
              <Select value={filterNup} onValueChange={setFilterNup}>
                <SelectTrigger className="h-9 w-[120px] text-[14px] font-normal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[14px] font-normal">
                    {t('filter.all')}
                  </SelectItem>
                  {NUP_OPTIONS.map((n) => (
                    <SelectItem
                      key={n}
                      value={n}
                      className="text-[14px] font-normal"
                    >
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-[14px] text-black font-normal">
                {t('filter.active')}
              </Label>
              <Select
                value={filterActive}
                onValueChange={(v) =>
                  setFilterActive(v as 'all' | 'active' | 'inactive')
                }
              >
                <SelectTrigger className="h-9 w-[140px] text-[14px] font-normal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[14px] font-normal">
                    {t('filter.all')}
                  </SelectItem>
                  <SelectItem
                    value="active"
                    className="text-[14px] font-normal"
                  >
                    {t('filter.activeOnly')}
                  </SelectItem>
                  <SelectItem
                    value="inactive"
                    className="text-[14px] font-normal"
                  >
                    {t('filter.inactiveOnly')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-[14px] text-black font-normal opacity-70">
              {t('counter', { count: filtered.length })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.sizeCode')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  NUP
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.orientation')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.grid')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.cropMark')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.active')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.createdAt')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold text-right">
                  {t('column.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presetsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-[14px] font-normal">
                    {t('loading')}
                  </TableCell>
                </TableRow>
              )}
              {!presetsQuery.isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-[14px] font-normal">
                    {t('empty')}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-[14px] text-black font-normal">
                    {p.sizeCode}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[14px] font-normal">
                      {p.nup}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[14px] text-black font-normal">
                    {t(`orientation.${p.paperOrientation}`)}
                  </TableCell>
                  <TableCell className="text-[14px] text-black font-normal">
                    {p.gridCols} × {p.gridRows}
                  </TableCell>
                  <TableCell className="text-[14px] text-black font-normal">
                    {p.cropMarkLengthMm}mm / {p.cropMarkThicknessPt}pt /{' '}
                    {p.cropMarkColor}
                  </TableCell>
                  <TableCell>
                    {p.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[14px] font-normal">
                        {t('badge.active')}
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-200 text-gray-700 text-[14px] font-normal">
                        {t('badge.inactive')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-[14px] text-black font-normal">
                    {format(new Date(p.createdAt), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[14px] font-normal"
                        onClick={() => openEdit(p)}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        {t('action.edit')}
                      </Button>
                      {p.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[14px] font-normal text-red-700"
                          onClick={() => setConfirmDeactivate(p)}
                        >
                          <PowerOff className="h-3.5 w-3.5 mr-1" />
                          {t('action.deactivate')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 신규 등록 모달 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              {t('dialog.createTitle')}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-black font-normal">
              {t('dialog.createDesc')}
            </DialogDescription>
          </DialogHeader>
          <PresetForm
            form={form}
            setForm={setForm}
            applyNup={(n) => setForm((f) => applyNupDefaults(n, f))}
            mode="create"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="h-9 text-[14px] font-normal"
            >
              {t('action.cancel')}
            </Button>
            <Button
              onClick={submitCreate}
              disabled={createMutation.isPending}
              className="h-9 text-[14px] font-normal"
            >
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 모달 */}
      <Dialog
        open={!!editPreset}
        onOpenChange={(open) => !open && setEditPreset(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              {t('dialog.editTitle')}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-black font-normal">
              {editPreset
                ? `${editPreset.sizeCode} · ${editPreset.nup}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <PresetForm
            form={form}
            setForm={setForm}
            applyNup={(n) => setForm((f) => applyNupDefaults(n, f))}
            mode="edit"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditPreset(null)}
              className="h-9 text-[14px] font-normal"
            >
              {t('action.cancel')}
            </Button>
            <Button
              onClick={submitEdit}
              disabled={updateMutation.isPending}
              className="h-9 text-[14px] font-normal"
            >
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비활성화 확인 모달 */}
      <Dialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              {t('dialog.deactivateTitle')}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-black font-normal">
              {confirmDeactivate &&
                t('dialog.deactivateDesc', {
                  sizeCode: confirmDeactivate.sizeCode,
                  nup: confirmDeactivate.nup,
                })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeactivate(null)}
              className="h-9 text-[14px] font-normal"
            >
              {t('action.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={submitDeactivate}
              disabled={deactivateMutation.isPending}
              className="h-9 text-[14px] font-normal"
            >
              {t('action.deactivate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================
// PresetForm — 신규/수정 모달에서 공용으로 쓰는 폼
// =============================================================

interface PresetFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  applyNup: (nup: string) => void;
  mode: 'create' | 'edit';
}

function PresetForm({ form, setForm, applyNup, mode }: PresetFormProps) {
  const t = useTranslations('printRoom.adminPresets');
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 좌측: 입력 */}
      <div className="space-y-3">
        <div>
          <Label className="text-[14px] text-black font-normal">
            {t('field.sizeCode')}
          </Label>
          <Input
            value={form.sizeCode}
            onChange={(e) =>
              setForm((f) => ({ ...f, sizeCode: e.target.value }))
            }
            disabled={mode === 'edit'}
            placeholder={t('placeholder.sizeCode')}
            className="h-9 text-[14px] font-normal"
          />
        </div>

        <div>
          <Label className="text-[14px] text-black font-normal">NUP</Label>
          <Select
            value={form.nup}
            onValueChange={(v) => applyNup(v)}
            disabled={mode === 'edit'}
          >
            <SelectTrigger className="h-9 text-[14px] font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NUP_OPTIONS.map((n) => (
                <SelectItem
                  key={n}
                  value={n}
                  className="text-[14px] font-normal"
                >
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[14px] text-black font-normal">
            {t('field.paperOrientation')}
          </Label>
          <RadioGroup
            value={form.paperOrientation}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, paperOrientation: v as Orientation }))
            }
            className="flex gap-3 mt-1"
          >
            <div className="flex items-center gap-1">
              <RadioGroupItem value="landscape" id="r-landscape" />
              <Label
                htmlFor="r-landscape"
                className="text-[14px] font-normal cursor-pointer"
              >
                {t('orientation.landscape')}
              </Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="portrait" id="r-portrait" />
              <Label
                htmlFor="r-portrait"
                className="text-[14px] font-normal cursor-pointer"
              >
                {t('orientation.portrait')}
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[14px] text-black font-normal">
              {t('field.gridCols')}
            </Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={form.gridCols}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  gridCols: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="h-9 text-[14px] font-normal"
            />
          </div>
          <div>
            <Label className="text-[14px] text-black font-normal">
              {t('field.gridRows')}
            </Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={form.gridRows}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  gridRows: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="h-9 text-[14px] font-normal"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[14px] text-black font-normal">
              {t('field.marginMm')}
            </Label>
            <Input
              type="number"
              step="0.5"
              min={0}
              max={100}
              value={form.marginMm}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  marginMm: parseFloat(e.target.value) || 0,
                }))
              }
              className="h-9 text-[14px] font-normal"
            />
          </div>
          <div>
            <Label className="text-[14px] text-black font-normal">
              {t('field.cropLen')}
            </Label>
            <Input
              type="number"
              step="0.5"
              min={0}
              max={50}
              value={form.cropMarkLengthMm}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cropMarkLengthMm: parseFloat(e.target.value) || 0,
                }))
              }
              className="h-9 text-[14px] font-normal"
            />
          </div>
          <div>
            <Label className="text-[14px] text-black font-normal">
              {t('field.cropThick')}
            </Label>
            <Input
              type="number"
              step="0.05"
              min={0}
              max={10}
              value={form.cropMarkThicknessPt}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cropMarkThicknessPt: parseFloat(e.target.value) || 0,
                }))
              }
              className="h-9 text-[14px] font-normal"
            />
          </div>
        </div>

        <div>
          <Label className="text-[14px] text-black font-normal">
            {t('field.cropColor')}
          </Label>
          <Input
            value={form.cropMarkColor}
            onChange={(e) =>
              setForm((f) => ({ ...f, cropMarkColor: e.target.value }))
            }
            className="h-9 text-[14px] font-normal"
          />
        </div>
      </div>

      {/* 우측: 미니 미리보기 */}
      <div className="flex flex-col">
        <Label className="text-[14px] text-black font-bold mb-2">
          {t('field.miniPreview')}
        </Label>
        <MiniPreview form={form} />
        <div className="text-[14px] text-black font-normal opacity-70 mt-2">
          {t('hint.gridAuto')}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// MiniPreview — 폼 변경 시 실시간 그리드/마진/크롭 미리보기 (단순 SVG)
// =============================================================

function MiniPreview({ form }: { form: FormState }) {
  const W = 240;
  const H = 240;
  const padding = 12;

  // 정규화된 셀 비율 (실제 크기 무시, 그리드 형태만 표현)
  const cellAspect = form.paperOrientation === 'portrait' ? 0.75 : 1.33;
  const totalW = form.gridCols * cellAspect + (form.marginMm / 50) * 2;
  const totalH = form.gridRows * 1 + (form.marginMm / 50) * 2;
  const scale = Math.min(
    (W - padding * 2) / totalW,
    (H - padding * 2) / totalH,
  );
  const sheetW = totalW * scale;
  const sheetH = totalH * scale;
  const sx = (W - sheetW) / 2;
  const sy = (H - sheetH) / 2;
  const m = (form.marginMm / 50) * scale;
  const cellW = cellAspect * scale;
  const cellH = scale;

  const cells: { x: number; y: number; n: number }[] = [];
  let n = 1;
  for (let r = 0; r < form.gridRows; r++) {
    for (let c = 0; c < form.gridCols; c++) {
      cells.push({
        x: sx + m + c * cellW,
        y: sy + m + r * cellH,
        n: n++,
      });
    }
  }

  const cropLen = Math.max(2, form.cropMarkLengthMm * 0.5);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="border bg-white rounded"
    >
      {/* 용지 */}
      <rect
        x={sx}
        y={sy}
        width={sheetW}
        height={sheetH}
        fill="#fafafa"
        stroke="#1f2937"
        strokeWidth={1}
      />
      {/* 마진 영역 */}
      <rect
        x={sx + m}
        y={sy + m}
        width={sheetW - 2 * m}
        height={sheetH - 2 * m}
        fill="#e5e7eb"
      />
      {/* 셀 + 번호 */}
      {cells.map((cell) => (
        <g key={cell.n}>
          <rect
            x={cell.x}
            y={cell.y}
            width={cellW}
            height={cellH}
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth={0.5}
          />
          <text
            x={cell.x + cellW / 2}
            y={cell.y + cellH / 2}
            fontSize={Math.max(9, Math.min(14, cellW / 4))}
            fill="#475569"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {cell.n}
          </text>
        </g>
      ))}
      {/* 크롭마크 (간소화) */}
      {Array.from({ length: form.gridRows + 1 }).flatMap((_, r) =>
        Array.from({ length: form.gridCols + 1 }).map((_, c) => {
          const cx = sx + m + c * cellW;
          const cy = sy + m + r * cellH;
          return (
            <g key={`crop-${r}-${c}`} stroke="#000" strokeWidth={0.5}>
              <line x1={cx - cropLen} y1={cy} x2={cx - 1} y2={cy} />
              <line x1={cx + 1} y1={cy} x2={cx + cropLen} y2={cy} />
              <line x1={cx} y1={cy - cropLen} x2={cx} y2={cy - 1} />
              <line x1={cx} y1={cy + 1} x2={cx} y2={cy + cropLen} />
            </g>
          );
        }),
      )}
    </svg>
  );
}

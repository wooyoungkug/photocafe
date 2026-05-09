'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  useImpositionPresets,
  useCreateImpositionPreset,
  useUpdateImpositionPreset,
  useDeleteImpositionPreset,
  useImpositionRules,
  useCreateImpositionRule,
  useUpdateImpositionRule,
  useDeleteImpositionRule,
  useSeedImposition,
  ImpositionPreset,
  ImpositionRule,
  BindingType,
} from '@/hooks/use-imposition';
import { usePdfSettings } from '@/hooks/use-pdf-settings';

const BINDING_LABELS: Record<BindingType, string> = {
  compressed: '압축앨범',
  tack: '핀제본',
  perfect: '무선제본',
  flat: '단일',
};

const BINDING_GROUPS: BindingType[] = ['compressed', 'tack', 'perfect', 'flat'];

/**
 * 임포지션 프리셋 + 매칭 규칙 관리 페이지.
 * 좌: 제본방식별 그룹 리스트 + 검색
 * 우: 선택 프리셋 편집 + 미니 프리뷰(SVG) + 매칭 규칙 편집
 */
export default function ImpositionPresetsPage() {
  const { data: presets = [], isLoading: presetsLoading } =
    useImpositionPresets();
  const { data: rules = [], isLoading: rulesLoading } = useImpositionRules();
  const createPresetMut = useCreateImpositionPreset();
  const updatePresetMut = useUpdateImpositionPreset();
  const deletePresetMut = useDeleteImpositionPreset();
  const createRuleMut = useCreateImpositionRule();
  const updateRuleMut = useUpdateImpositionRule();
  const deleteRuleMut = useDeleteImpositionRule();
  const seedMut = useSeedImposition();
  const pdfSettings = usePdfSettings();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeBinding, setActiveBinding] = useState<BindingType>('compressed');
  // `_즉시_` prefix 는 임포지션 실행 다이얼로그가 자동 생성/재사용하는 임시 프리셋.
  // 기본적으로 숨겨 목록을 깔끔하게 유지하고, 필요 시 토글로 노출.
  const [showTransient, setShowTransient] = useState(false);

  const transientCount = useMemo(
    () => presets.filter((p) => p.name.startsWith('_즉시_')).length,
    [presets],
  );

  const filteredByBinding = useMemo(() => {
    const byBinding: Record<BindingType, ImpositionPreset[]> = {
      compressed: [],
      tack: [],
      perfect: [],
      flat: [],
    };
    const q = search.trim().toLowerCase();
    for (const p of presets) {
      // 임시 프리셋 숨김 (검색 중이 아니고 토글 OFF 일 때)
      if (!showTransient && !q && p.name.startsWith('_즉시_')) {
        continue;
      }
      if (q && !p.name.toLowerCase().includes(q) && !(p.productSize ?? '').toLowerCase().includes(q)) {
        continue;
      }
      (byBinding[p.bindingType] ??= []).push(p);
    }
    // 각 그룹 정렬: productSize 라벨 → targetNup
    for (const k of Object.keys(byBinding) as BindingType[]) {
      byBinding[k].sort((a, b) => {
        const sa = (a.productSize ?? '').localeCompare(b.productSize ?? '');
        if (sa !== 0) return sa;
        return (a.targetNup ?? 0) - (b.targetNup ?? 0);
      });
    }
    return byBinding;
  }, [presets, search]);

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedId) || null,
    [presets, selectedId],
  );
  const relatedRules = useMemo(
    () => rules.filter((r) => r.presetId === selectedId),
    [rules, selectedId],
  );

  // ===== 액션: 새 프리셋 =====
  const onNewPreset = () => {
    createPresetMut.mutate(
      {
        name: `새 프리셋 ${Date.now()}`,
        bindingType: activeBinding,
        sheetWidth: 330,
        sheetHeight: 482,
        marginTop: 5,
        marginRight: 5,
        marginBottom: 5,
        marginLeft: 5,
        gutter: 3,
        bleed: pdfSettings.bleedSize,
        grainDirection: 'short',
        rotationPolicy: 'auto',
        isDefault: false,
      } as any,
      {
        onSuccess: (p) => {
          toast.success('프리셋이 생성되었습니다.');
          setSelectedId(p.id);
        },
        onError: (e) => toast.error(`생성 실패: ${e.message}`),
      },
    );
  };

  // ===== 액션: 시드 재등록 =====
  const onSeed = () => {
    if (!confirm('임포지션 프리셋·규칙을 시드 데이터로 재등록합니다. 진행할까요?')) return;
    seedMut.mutate(undefined, {
      onSuccess: (r) => toast.success(`시드 완료: ${r.count}개 프리셋/규칙`),
      onError: (e) => toast.error(`시드 실패: ${e.message}`),
    });
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] text-black font-normal">임포지션 프리셋</h1>
          <p className="text-[14px] text-black font-normal mt-1">
            제품 규격·제본방식·페이지수에 따라 인디고 7900 자동 임포지션에 사용되는 프리셋과 매칭 규칙을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onSeed} disabled={seedMut.isPending}>
            {seedMut.isPending ? '시드 중...' : '시드 재등록'}
          </Button>
          <Button onClick={onNewPreset} disabled={createPresetMut.isPending}>
            새 프리셋
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[360px_1fr] gap-4 items-start">
        {/* 좌: 리스트 */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input
              placeholder="이름 또는 규격 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-[14px]"
            />

            {transientCount > 0 && (
              <div className="flex items-center gap-2 px-1">
                <Switch
                  checked={showTransient}
                  onCheckedChange={setShowTransient}
                />
                <Label className="text-[14px] text-black font-normal">
                  임시 프리셋 표시
                  <span className="text-gray-500 ml-1">
                    (_즉시_ · {transientCount}개)
                  </span>
                </Label>
              </div>
            )}

            <Tabs
              value={activeBinding}
              onValueChange={(v) => setActiveBinding(v as BindingType)}
            >
              <TabsList className="grid grid-cols-4">
                {BINDING_GROUPS.map((b) => (
                  <TabsTrigger
                    key={b}
                    value={b}
                    className="text-[14px] text-black font-normal"
                  >
                    {BINDING_LABELS[b]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {BINDING_GROUPS.map((b) => (
                <TabsContent key={b} value={b} className="mt-3 space-y-1">
                  {presetsLoading && (
                    <div className="text-[14px] text-black font-normal py-6 text-center">
                      불러오는 중...
                    </div>
                  )}
                  {!presetsLoading && filteredByBinding[b].length === 0 && (
                    <div className="text-[14px] text-black font-normal py-6 text-center">
                      프리셋이 없습니다. [새 프리셋] 또는 [시드 재등록]을 눌러주세요.
                    </div>
                  )}
                  <ul className="max-h-[560px] overflow-y-auto divide-y">
                    {filteredByBinding[b].map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(p.id)}
                          className={`w-full text-left px-3 py-2 text-[14px] text-black font-normal hover:bg-gray-50 ${
                            selectedId === p.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>
                              {p.isDefault && <span className="text-amber-600">★ </span>}
                              {p.name}
                            </span>
                            {p.productSize && (
                              <Badge variant="outline" className="text-[12px]">
                                {p.productSize}
                                {p.targetNup ? ` · ${p.targetNup}Up` : ''}
                              </Badge>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* 우: 상세 편집 */}
        <div className="space-y-4">
          {!selectedPreset ? (
            <Card>
              <CardContent className="py-12 text-center text-[14px] text-black font-normal">
                좌측 리스트에서 프리셋을 선택하거나 [새 프리셋]을 눌러 생성하세요.
              </CardContent>
            </Card>
          ) : (
            <PresetEditor
              preset={selectedPreset}
              onSave={(patch) =>
                updatePresetMut.mutate(
                  { id: selectedPreset.id, body: patch },
                  {
                    onSuccess: () => toast.success('프리셋이 저장되었습니다.'),
                    onError: (e) => toast.error(`저장 실패: ${e.message}`),
                  },
                )
              }
              onDelete={() => {
                if (!confirm(`"${selectedPreset.name}" 프리셋을 삭제할까요? 매칭 규칙도 함께 삭제됩니다.`)) return;
                deletePresetMut.mutate(selectedPreset.id, {
                  onSuccess: () => {
                    toast.success('프리셋이 삭제되었습니다.');
                    setSelectedId(null);
                  },
                  onError: (e) => toast.error(`삭제 실패: ${e.message}`),
                });
              }}
            />
          )}

          {selectedPreset && (
            <RulesPanel
              preset={selectedPreset}
              rules={relatedRules}
              loading={rulesLoading}
              onCreate={(body) =>
                createRuleMut.mutate(
                  { ...body, presetId: selectedPreset.id },
                  {
                    onSuccess: () => toast.success('규칙이 추가되었습니다.'),
                    onError: (e) => toast.error(`추가 실패: ${e.message}`),
                  },
                )
              }
              onUpdate={(id, body) =>
                updateRuleMut.mutate(
                  { id, body },
                  {
                    onSuccess: () => toast.success('규칙이 수정되었습니다.'),
                    onError: (e) => toast.error(`수정 실패: ${e.message}`),
                  },
                )
              }
              onDelete={(id) => {
                if (!confirm('이 규칙을 삭제할까요?')) return;
                deleteRuleMut.mutate(id, {
                  onSuccess: () => toast.success('규칙이 삭제되었습니다.'),
                  onError: (e) => toast.error(`삭제 실패: ${e.message}`),
                });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// =========================== Preset 편집 ===========================
function PresetEditor({
  preset,
  onSave,
  onDelete,
}: {
  preset: ImpositionPreset;
  onSave: (patch: Partial<ImpositionPreset>) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<ImpositionPreset>(preset);
  // preset id 변경 시 폼 리셋
  useMemo(() => setForm(preset), [preset.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    const patch: any = {
      name: form.name,
      bindingType: form.bindingType,
      productSize: form.productSize ?? null,
      targetNup: form.targetNup ?? null,
      sheetWidth: Number(form.sheetWidth),
      sheetHeight: Number(form.sheetHeight),
      marginTop: Number(form.marginTop),
      marginRight: Number(form.marginRight),
      marginBottom: Number(form.marginBottom),
      marginLeft: Number(form.marginLeft),
      gutter: Number(form.gutter),
      bleed: Number(form.bleed),
      creaseWidth: form.creaseWidth ?? null,
      tackMargin: form.tackMargin ?? null,
      tackEdge: form.tackEdge ?? null,
      grainDirection: form.grainDirection,
      rotationPolicy: form.rotationPolicy,
      isDefault: form.isDefault,
    };
    onSave(patch);
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] text-black font-bold">프리셋 편집</h2>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            삭제
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[14px] text-black font-normal">이름</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-9 text-[14px]"
            />
          </div>
          <div>
            <Label className="text-[14px] text-black font-normal">제본방식</Label>
            <Select
              value={form.bindingType}
              onValueChange={(v) => setForm({ ...form, bindingType: v as BindingType })}
            >
              <SelectTrigger className="h-9 text-[14px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BINDING_GROUPS.map((b) => (
                  <SelectItem key={b} value={b} className="text-[14px]">
                    {BINDING_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[14px] text-black font-normal">규격 라벨 (A4/A5/…)</Label>
            <Input
              value={form.productSize ?? ''}
              placeholder="예: A4"
              onChange={(e) => setForm({ ...form, productSize: e.target.value || null })}
              className="h-9 text-[14px]"
            />
          </div>
          <div>
            <Label className="text-[14px] text-black font-normal">목표 Nup (선택)</Label>
            <Input
              type="number"
              value={form.targetNup ?? ''}
              placeholder="자동"
              onChange={(e) =>
                setForm({ ...form, targetNup: e.target.value === '' ? null : Number(e.target.value) })
              }
              className="h-9 text-[14px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'sheetWidth', label: '시트 W' },
            { key: 'sheetHeight', label: '시트 H' },
            { key: 'bleed', label: 'Bleed' },
            { key: 'gutter', label: 'Gutter' },
          ].map((f) => (
            <div key={f.key}>
              <Label className="text-[14px] text-black font-normal">{f.label}</Label>
              <Input
                type="number"
                value={(form as any)[f.key]}
                onChange={(e) =>
                  setForm({ ...form, [f.key]: Number(e.target.value) } as any)
                }
                className="h-9 text-[14px]"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'marginTop', label: '여백 T' },
            { key: 'marginRight', label: '여백 R' },
            { key: 'marginBottom', label: '여백 B' },
            { key: 'marginLeft', label: '여백 L' },
          ].map((f) => (
            <div key={f.key}>
              <Label className="text-[14px] text-black font-normal">{f.label}</Label>
              <Input
                type="number"
                value={(form as any)[f.key]}
                onChange={(e) =>
                  setForm({ ...form, [f.key]: Number(e.target.value) } as any)
                }
                className="h-9 text-[14px]"
              />
            </div>
          ))}
        </div>

        {form.bindingType === 'compressed' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[14px] text-black font-normal">오시 폭 (mm)</Label>
              <Input
                type="number"
                step={0.1}
                value={form.creaseWidth ?? 0}
                onChange={(e) =>
                  setForm({ ...form, creaseWidth: Number(e.target.value) })
                }
                className="h-9 text-[14px]"
              />
            </div>
          </div>
        )}

        {form.bindingType === 'tack' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[14px] text-black font-normal">타카 여백 (mm)</Label>
              <Input
                type="number"
                value={form.tackMargin ?? 12}
                onChange={(e) =>
                  setForm({ ...form, tackMargin: Number(e.target.value) })
                }
                className="h-9 text-[14px]"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">타카 위치</Label>
              <Select
                value={form.tackEdge ?? 'left'}
                onValueChange={(v) => setForm({ ...form, tackEdge: v as any })}
              >
                <SelectTrigger className="h-9 text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['left', 'right', 'top', 'bottom'].map((e) => (
                    <SelectItem key={e} value={e} className="text-[14px]">
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Switch
            checked={form.isDefault}
            onCheckedChange={(v) => setForm({ ...form, isDefault: v })}
          />
          <Label className="text-[14px] text-black font-normal">기본 프리셋 (같은 제본방식 내 1개)</Label>
        </div>

        {/* 미니 프리뷰 */}
        <div className="border rounded-md p-3 bg-gray-50">
          <div className="text-[14px] text-black font-bold mb-2">프리뷰</div>
          <MiniPreview preset={form} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setForm(preset)}>
            되돌리기
          </Button>
          <Button onClick={save}>저장</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =========================== 매칭 규칙 ===========================
function RulesPanel({
  preset,
  rules,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: {
  preset: ImpositionPreset;
  rules: ImpositionRule[];
  loading: boolean;
  onCreate: (body: any) => void;
  onUpdate: (id: string, body: any) => void;
  onDelete: (id: string) => void;
}) {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] text-black font-bold">매칭 규칙</h2>
          <Button
            size="sm"
            onClick={() =>
              onCreate({
                productSize: preset.productSize ?? null,
                bindingType: preset.bindingType,
                minPages: null,
                maxPages: null,
                priority: 100,
                isActive: true,
                description: `${preset.name} 자동 매칭`,
              })
            }
          >
            규칙 추가
          </Button>
        </div>

        {loading && (
          <div className="text-[14px] text-black font-normal py-4 text-center">불러오는 중...</div>
        )}
        {!loading && sorted.length === 0 && (
          <div className="text-[14px] text-black font-normal py-4 text-center">
            규칙이 없습니다. "규칙 추가"를 눌러 이 프리셋 매칭 조건을 설정하세요.
          </div>
        )}

        <ul className="space-y-2">
          {sorted.map((r) => (
            <li
              key={r.id}
              className="border rounded-md px-3 py-2 flex items-center gap-3 flex-wrap"
            >
              <Input
                className="h-8 w-[120px] text-[14px]"
                value={r.priority}
                type="number"
                onChange={(e) =>
                  onUpdate(r.id, { priority: Number(e.target.value) })
                }
              />
              <Input
                className="h-8 w-[100px] text-[14px]"
                placeholder="규격"
                value={r.productSize ?? ''}
                onChange={(e) =>
                  onUpdate(r.id, { productSize: e.target.value || null })
                }
              />
              <Select
                value={r.bindingType ?? 'any'}
                onValueChange={(v) =>
                  onUpdate(r.id, { bindingType: v === 'any' ? null : v })
                }
              >
                <SelectTrigger className="h-8 w-[120px] text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any" className="text-[14px]">any</SelectItem>
                  {BINDING_GROUPS.map((b) => (
                    <SelectItem key={b} value={b} className="text-[14px]">
                      {BINDING_LABELS[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-8 w-[80px] text-[14px]"
                placeholder="min"
                type="number"
                value={r.minPages ?? ''}
                onChange={(e) =>
                  onUpdate(r.id, {
                    minPages: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
              <Input
                className="h-8 w-[80px] text-[14px]"
                placeholder="max"
                type="number"
                value={r.maxPages ?? ''}
                onChange={(e) =>
                  onUpdate(r.id, {
                    maxPages: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
              <div className="flex items-center gap-1">
                <Switch
                  checked={r.isActive}
                  onCheckedChange={(v) => onUpdate(r.id, { isActive: v })}
                />
                <Label className="text-[14px] text-black font-normal">사용</Label>
              </div>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(r.id)}
              >
                삭제
              </Button>
            </li>
          ))}
        </ul>

        <p className="text-[14px] text-black font-normal">
          priority 가 큰 규칙이 먼저 매칭됩니다. 규격이 비면 모든 규격과 매칭되고, 페이지 범위가 비면 모든 페이지와 매칭됩니다.
        </p>
      </CardContent>
    </Card>
  );
}

// =========================== 미니 프리뷰 ===========================
function MiniPreview({ preset }: { preset: ImpositionPreset }) {
  const sw = Number(preset.sheetWidth);
  const sh = Number(preset.sheetHeight);
  const targetNup = preset.targetNup ?? 1;

  // 단순 그리드 분할로 Nup 시각화 (실제 계산은 런타임 엔진이 수행)
  // targetNup 에 맞춰 가로 우선 배치
  const cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(targetNup * (sw / sh)))));
  const rows = Math.max(1, Math.ceil(targetNup / cols));
  const cellW = (sw - 10) / cols;
  const cellH = (sh - 10) / rows;

  // SVG viewBox 을 시트 크기에 맞춰
  const vbW = sw;
  const vbH = sh;
  // 화면 폭 고정 320 — 세로 비율 유지
  const displayW = 320;
  const displayH = Math.round((displayW * vbH) / vbW);

  const cells: { x: number; y: number; i: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i >= targetNup) break;
      cells.push({
        x: 5 + c * cellW,
        y: 5 + r * cellH,
        i: i + 1,
      });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={displayW}
      height={displayH}
      className="bg-white border"
    >
      {/* 시트 외곽 */}
      <rect x={0} y={0} width={vbW} height={vbH} fill="none" stroke="#ccc" strokeWidth={0.5} />
      {/* 여백 박스 */}
      <rect
        x={Number(preset.marginLeft)}
        y={Number(preset.marginTop)}
        width={vbW - Number(preset.marginLeft) - Number(preset.marginRight)}
        height={vbH - Number(preset.marginTop) - Number(preset.marginBottom)}
        fill="none"
        stroke="#e5e7eb"
        strokeDasharray="2 2"
        strokeWidth={0.4}
      />
      {cells.map((c) => (
        <g key={c.i}>
          <rect
            x={c.x}
            y={c.y}
            width={cellW - 4}
            height={cellH - 4}
            fill={preset.bindingType === 'compressed' ? '#DBEAFE' : preset.bindingType === 'tack' ? '#FEF3C7' : preset.bindingType === 'perfect' ? '#DCFCE7' : '#F3F4F6'}
            stroke="#6B7280"
            strokeWidth={0.3}
          />
          {/* compressed 면 중앙 오시 */}
          {preset.bindingType === 'compressed' && (preset.targetNup ?? 1) >= 2 && (
            <line
              x1={c.x + (cellW - 4) / 2}
              y1={c.y}
              x2={c.x + (cellW - 4) / 2}
              y2={c.y + cellH - 4}
              stroke="#2563EB"
              strokeWidth={0.5}
              strokeDasharray="2 2"
            />
          )}
          <text
            x={c.x + (cellW - 4) / 2}
            y={c.y + (cellH - 4) / 2}
            fontSize={Math.max(6, cellH / 6)}
            fill="#4B5563"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {c.i}
          </text>
        </g>
      ))}
    </svg>
  );
}

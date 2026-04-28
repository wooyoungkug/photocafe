"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw, Type } from "lucide-react";
import { toast } from "sonner";
import {
  TYPOGRAPHY_KEYS,
  TYPOGRAPHY_DEFAULTS,
  TYPOGRAPHY_LABELS,
  TYPOGRAPHY_RANGE,
  useTypographyValues,
} from "@/hooks/use-typography";
import { useBulkUpdateSettings } from "@/hooks/use-system-settings";

type TokenKey = keyof typeof TYPOGRAPHY_KEYS;

const ALL_TOKENS = Object.keys(TYPOGRAPHY_KEYS) as TokenKey[];

const GLOBAL_TOKENS: TokenKey[] = ["body", "title", "heading"];
const MENU_TOKENS: TokenKey[] = ["menuMain", "menuSub", "menuMegaHeader", "pin"];

const TOKEN_DESCRIPTIONS: Record<TokenKey, string> = {
  body: "일반 텍스트, 폼 라벨, 표 셀 등",
  title: "페이지 제목, 카드 헤더, 섹션 제목",
  heading: "큰 제목, 대시보드 KPI 숫자 등",
  menuMain: "상단 가로 메뉴바의 대메뉴 (대시보드, 주문관리…)",
  menuSub: "메가메뉴/드롭다운 안의 서브메뉴 항목",
  menuMegaHeader: "메가메뉴 그룹 컬럼 헤더 (매출관리, 매입관리…)",
  pin: "핀(즐겨찾기) 바 항목",
};

export default function TypographySettingsContent() {
  const current = useTypographyValues();
  const bulkUpdate = useBulkUpdateSettings();

  const [draft, setDraft] = useState<Record<TokenKey, number>>(current);
  const [dirty, setDirty] = useState(false);

  // 서버 값 로드 시 draft 동기화 (사용자가 편집 중이 아니면)
  useEffect(() => {
    if (!dirty) {
      setDraft(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    current.body,
    current.title,
    current.heading,
    current.menuMain,
    current.menuSub,
    current.menuMegaHeader,
    current.pin,
  ]);

  const handleChange = (key: TokenKey, value: number) => {
    setDirty(true);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const payload = ALL_TOKENS.map((tokenKey) => ({
      key: TYPOGRAPHY_KEYS[tokenKey],
      value: String(draft[tokenKey]),
      category: "typography",
      label: TYPOGRAPHY_LABELS[tokenKey],
    }));
    try {
      await bulkUpdate.mutateAsync(payload);
      setDirty(false);
    } catch (err) {
      toast.error("저장 실패");
    }
  };

  const handleResetAll = () => {
    setDraft({ ...TYPOGRAPHY_DEFAULTS });
    setDirty(true);
  };

  const renderTokenRow = (key: TokenKey) => {
    const value = draft[key];
    const def = TYPOGRAPHY_DEFAULTS[key];
    const isChanged = value !== def;
    return (
      <div
        key={key}
        className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center gap-3 py-3 border-b last:border-b-0"
      >
        <div className="min-w-0">
          <Label htmlFor={`fs-${key}`} className="text-[14px] font-bold text-black">
            {TYPOGRAPHY_LABELS[key]}
          </Label>
          <p className="text-[14px] text-slate-500 mt-0.5">{TOKEN_DESCRIPTIONS[key]}</p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            id={`fs-${key}`}
            type="number"
            min={TYPOGRAPHY_RANGE.min}
            max={TYPOGRAPHY_RANGE.max}
            value={value}
            onChange={(e) => handleChange(key, Number(e.target.value))}
            className="w-20 text-center"
          />
          <span className="text-[14px] text-slate-500 w-6">px</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 미리보기 */}
          <div
            className="px-3 py-1.5 rounded border bg-slate-50 text-black font-normal min-w-[80px] text-center"
            style={{ fontSize: `${value}px` }}
          >
            가나다 ABC
          </div>
          {isChanged && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleChange(key, def)}
              className="text-[14px] text-slate-500"
              title={`기본값(${def}px)으로 되돌리기`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[18px] font-bold text-black">
            <Type className="h-5 w-5" />
            타이포그래피
          </CardTitle>
          <CardDescription className="text-[14px] text-slate-600 font-normal">
            전체 직원 공통으로 적용되는 서체 크기 설정입니다. 변경 후 저장하면 즉시 모든 화면에 반영됩니다. 허용 범위: {TYPOGRAPHY_RANGE.min}~{TYPOGRAPHY_RANGE.max}px
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 전역 토큰 */}
          <section>
            <h3 className="text-[14px] font-bold text-black mb-1">전역 서체 토큰</h3>
            <p className="text-[14px] text-slate-500 mb-2">
              시스템 전반의 모든 화면에 적용됩니다. 변경 시 레이아웃 깨짐에 주의하세요.
            </p>
            <div className="rounded-md border bg-white px-4">
              {GLOBAL_TOKENS.map(renderTokenRow)}
            </div>
          </section>

          {/* 메뉴 토큰 */}
          <section>
            <h3 className="text-[14px] font-bold text-black mb-1">상단 메뉴/핀 바 토큰</h3>
            <p className="text-[14px] text-slate-500 mb-2">
              상단 메뉴바 영역 한정으로 적용됩니다.
            </p>
            <div className="rounded-md border bg-white px-4">
              {MENU_TOKENS.map(renderTokenRow)}
            </div>
          </section>

          {/* 액션 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetAll}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              전체 기본값으로 초기화
            </Button>

            <div className="flex items-center gap-2">
              {dirty && (
                <span className="text-[14px] text-amber-600">변경된 사항이 있습니다</span>
              )}
              <Button
                type="button"
                onClick={handleSave}
                disabled={!dirty || bulkUpdate.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {bulkUpdate.isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

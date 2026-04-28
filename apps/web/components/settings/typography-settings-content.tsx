"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save, RotateCcw, Type, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  TYPOGRAPHY_KEYS,
  TYPOGRAPHY_DEFAULTS,
  TYPOGRAPHY_LABELS,
  TYPOGRAPHY_RANGE,
  useTypographyValues,
  applyTypographyVars,
  MENU_STYLE_KEYS,
  MENU_STYLE_TOKENS,
  type MenuStyleToken,
  type MenuStyleValues,
  useMenuStyleValues,
  applyMenuStyleOverrides,
} from "@/hooks/use-typography";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkUpdateSettings } from "@/hooks/use-system-settings";

type TokenKey = keyof typeof TYPOGRAPHY_KEYS;

const ALL_TOKENS = Object.keys(TYPOGRAPHY_KEYS) as TokenKey[];

const GLOBAL_TOKENS: TokenKey[] = ["body", "title", "heading"];
const MENU_TOKENS: TokenKey[] = ["menuMain", "menuSub", "menuMegaHeader", "pin"];
const TABLE_TOKENS: TokenKey[] = ["tableHead", "tableBody"];

const TOKEN_DESCRIPTIONS: Record<TokenKey, string> = {
  body: "일반 텍스트, 폼 라벨 등",
  title: "페이지 제목, 카드 헤더, 섹션 제목",
  heading: "큰 제목, 대시보드 KPI 숫자 등",
  menuMain: "상단 가로 메뉴바의 대메뉴 (대시보드, 주문관리…)",
  menuSub: "메가메뉴/드롭다운 안의 서브메뉴 항목",
  menuMegaHeader: "메가메뉴 그룹 컬럼 헤더 (매출관리, 매입관리…)",
  pin: "핀(즐겨찾기) 바 항목",
  tableHead: "주문목록·회원목록 등 모든 표의 헤더 (주문일/주문번호…)",
  tableBody: "표 데이터 셀 (주문 내용, 회원명 등)",
};

const EMPTY_STYLE: MenuStyleValues = { bold: false, italic: false, color: "" };

export default function TypographySettingsContent() {
  const current = useTypographyValues();
  const currentStyles = useMenuStyleValues();
  const bulkUpdate = useBulkUpdateSettings();

  const [draft, setDraft] = useState<Record<TokenKey, number>>(current);
  const [styleDraft, setStyleDraft] = useState<Record<MenuStyleToken, MenuStyleValues>>(currentStyles);
  const [dirty, setDirty] = useState(false);
  const [livePreview, setLivePreview] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);

  // 서버 값 로드 시 draft 동기화 (사용자가 편집 중이 아니면)
  useEffect(() => {
    if (!dirty) {
      setDraft(current);
      setStyleDraft(currentStyles);
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
    currentStyles.menuMain.bold,
    currentStyles.menuMain.italic,
    currentStyles.menuMain.color,
    currentStyles.menuSub.bold,
    currentStyles.menuSub.italic,
    currentStyles.menuSub.color,
    currentStyles.menuMegaHeader.bold,
    currentStyles.menuMegaHeader.italic,
    currentStyles.menuMegaHeader.color,
    currentStyles.pin.bold,
    currentStyles.pin.italic,
    currentStyles.pin.color,
    currentStyles.tableHead.bold,
    currentStyles.tableHead.italic,
    currentStyles.tableHead.color,
    currentStyles.tableBody.bold,
    currentStyles.tableBody.italic,
    currentStyles.tableBody.color,
  ]);

  const handleChange = (key: TokenKey, value: number) => {
    setDirty(true);
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (livePreview) {
        applyTypographyVars(next);
        setPreviewActive(true);
      }
      return next;
    });
  };

  const handleStyleChange = (token: MenuStyleToken, patch: Partial<MenuStyleValues>) => {
    setDirty(true);
    setStyleDraft((prev) => {
      const next = { ...prev, [token]: { ...prev[token], ...patch } };
      if (livePreview) {
        applyMenuStyleOverrides(next);
        setPreviewActive(true);
      }
      return next;
    });
  };

  const handleApplyPreview = () => {
    applyTypographyVars(draft);
    applyMenuStyleOverrides(styleDraft);
    setPreviewActive(true);
    toast.success("화면에 바로 적용했습니다 (저장 전)", {
      description: "저장하지 않으면 새로고침 시 원래 값으로 돌아갑니다.",
    });
  };

  const handleCancelPreview = () => {
    applyTypographyVars(current);
    applyMenuStyleOverrides(currentStyles);
    setDraft(current);
    setStyleDraft(currentStyles);
    setDirty(false);
    setPreviewActive(false);
  };

  const handleSave = async () => {
    const sizePayload = ALL_TOKENS.map((tokenKey) => ({
      key: TYPOGRAPHY_KEYS[tokenKey],
      value: String(draft[tokenKey]),
      category: "typography",
      label: TYPOGRAPHY_LABELS[tokenKey],
    }));
    const stylePayload = MENU_STYLE_TOKENS.flatMap((token) => [
      {
        key: MENU_STYLE_KEYS[token].bold,
        value: String(!!styleDraft[token].bold),
        category: "typography",
        label: `${TYPOGRAPHY_LABELS[token]} 볼드`,
      },
      {
        key: MENU_STYLE_KEYS[token].italic,
        value: String(!!styleDraft[token].italic),
        category: "typography",
        label: `${TYPOGRAPHY_LABELS[token]} 기울기`,
      },
      {
        key: MENU_STYLE_KEYS[token].color,
        value: styleDraft[token].color ?? "",
        category: "typography",
        label: `${TYPOGRAPHY_LABELS[token]} 색상`,
      },
    ]);
    try {
      await bulkUpdate.mutateAsync([...sizePayload, ...stylePayload]);
      applyTypographyVars(draft);
      applyMenuStyleOverrides(styleDraft);
      setDirty(false);
      setPreviewActive(false);
    } catch (err) {
      toast.error("저장 실패");
    }
  };

  const handleResetAll = () => {
    setDraft({ ...TYPOGRAPHY_DEFAULTS });
    const emptyStyles = MENU_STYLE_TOKENS.reduce((acc, t) => {
      acc[t] = { ...EMPTY_STYLE };
      return acc;
    }, {} as Record<MenuStyleToken, MenuStyleValues>);
    setStyleDraft(emptyStyles);
    setDirty(true);
    if (livePreview) {
      applyTypographyVars({ ...TYPOGRAPHY_DEFAULTS });
      applyMenuStyleOverrides(emptyStyles);
      setPreviewActive(true);
    }
  };

  const isMenuToken = (k: TokenKey): k is MenuStyleToken =>
    MENU_STYLE_TOKENS.includes(k as MenuStyleToken);

  const renderTokenRow = (key: TokenKey) => {
    const value = draft[key];
    const def = TYPOGRAPHY_DEFAULTS[key];
    const isChanged = value !== def;
    const menuStyle = isMenuToken(key) ? styleDraft[key] : null;
    const previewColor = menuStyle?.color || undefined;
    return (
      <div
        key={key}
        className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-3 border-b last:border-b-0"
      >
        <div className="min-w-0">
          <Label htmlFor={`fs-${key}`} className="text-[14px] font-bold text-black">
            {TYPOGRAPHY_LABELS[key]}
          </Label>
          <p className="text-[14px] text-slate-500 mt-0.5">{TOKEN_DESCRIPTIONS[key]}</p>
        </div>

        {/* 크기 입력 */}
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

        {/* 메뉴 토큰 전용: 볼드/기울기/컬러 */}
        {menuStyle ? (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={!!menuStyle.bold}
                onCheckedChange={(c) =>
                  handleStyleChange(key as MenuStyleToken, { bold: !!c })
                }
              />
              <span className="text-[14px] font-bold text-black">B</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={!!menuStyle.italic}
                onCheckedChange={(c) =>
                  handleStyleChange(key as MenuStyleToken, { italic: !!c })
                }
              />
              <span className="text-[14px] italic text-black">I</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={menuStyle.color || "#000000"}
                onChange={(e) =>
                  handleStyleChange(key as MenuStyleToken, { color: e.target.value })
                }
                className="h-7 w-7 rounded border cursor-pointer p-0"
                title="색상 선택"
              />
              {menuStyle.color && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStyleChange(key as MenuStyleToken, { color: "" })}
                  className="text-[14px] text-slate-500 px-1.5"
                  title="기본 색상으로 되돌리기"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div /> /* grid 칸 유지 */
        )}

        <div className="flex items-center gap-2">
          {/* 미리보기 */}
          <div
            className="px-3 py-1.5 rounded border bg-slate-50 min-w-[100px] text-center"
            style={{
              fontSize: `${value}px`,
              fontWeight: menuStyle?.bold ? 700 : 400,
              fontStyle: menuStyle?.italic ? "italic" : "normal",
              color: previewColor || "#000",
            }}
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
              상단 메뉴바 영역 한정으로 적용. 크기 외 <strong>B</strong>(볼드)/<strong>I</strong>(기울기)/색상도 조절 가능합니다.
            </p>
            <div className="rounded-md border bg-white px-4">
              {MENU_TOKENS.map(renderTokenRow)}
            </div>
          </section>

          {/* 표(테이블) 토큰 */}
          <section>
            <h3 className="text-[14px] font-bold text-black mb-1">표(테이블) 토큰</h3>
            <p className="text-[14px] text-slate-500 mb-2">
              주문목록·회원목록·견적목록 등 시스템 전체 모든 표에 적용됩니다 (시멘틱 th/td 기준).
              크기 외 <strong>B</strong>(볼드)/<strong>I</strong>(기울기)/색상도 조절 가능합니다.
            </p>
            <div className="rounded-md border bg-white px-4">
              {TABLE_TOKENS.map(renderTokenRow)}
            </div>
          </section>

          {/* 라이브 미리보기 토글 */}
          <div className="flex items-center justify-between rounded-md border bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-slate-500" />
              <div>
                <Label htmlFor="live-preview" className="text-[14px] font-bold text-black cursor-pointer">
                  변경 즉시 화면에 반영
                </Label>
                <p className="text-[14px] text-slate-500">
                  켜면 입력하는 동안 실시간으로 적용됩니다 (저장 전까지 임시).
                </p>
              </div>
            </div>
            <Switch
              id="live-preview"
              checked={livePreview}
              onCheckedChange={(v) => {
                setLivePreview(v);
                if (v) {
                  applyTypographyVars(draft);
                  setPreviewActive(true);
                }
              }}
            />
          </div>

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

            <div className="flex flex-wrap items-center gap-2">
              {dirty && (
                <span className="text-[14px] text-amber-600">변경된 사항이 있습니다</span>
              )}
              {previewActive && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelPreview}
                  className="gap-2 text-slate-600"
                  title="저장하지 않은 미리보기 취소"
                >
                  <EyeOff className="h-4 w-4" />
                  미리보기 취소
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={handleApplyPreview}
                disabled={!dirty}
                className="gap-2"
                title="저장 없이 화면에만 즉시 적용"
              >
                <Eye className="h-4 w-4" />
                바로 적용
              </Button>
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

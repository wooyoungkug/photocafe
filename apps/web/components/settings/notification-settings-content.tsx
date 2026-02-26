"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Save,
  RotateCcw,
  Volume2,
  Play,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  NOTIFICATION_POINTS,
  NOTIFICATION_CATEGORIES,
  DEFAULT_CONFIG,
  playBeep,
  processNotify,
  setNotificationConfig,
  type ProcessNotificationConfig,
  type NotifyMode,
  type NotificationPointKey,
  type NotificationCategoryKey,
} from "@/lib/process-notify";
import {
  useSystemSettings,
  useBulkUpdateSettings,
  settingsToMap,
} from "@/hooks/use-system-settings";

// ---------------------------------------------------------------------------
// 알림 방식 라벨
// ---------------------------------------------------------------------------

const MODE_LABELS: Record<NotifyMode | "default", string> = {
  default: "기본값",
  tts: "TTS 음성",
  beep: "비프음",
  off: "끄기",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationSettingsContent() {
  // -------------------------------------------------------------------------
  // 설정 로드
  // -------------------------------------------------------------------------
  const { data: settings, isLoading } = useSystemSettings("notification");
  const bulkUpdate = useBulkUpdateSettings();

  // -------------------------------------------------------------------------
  // 로컬 상태 (폼)
  // -------------------------------------------------------------------------
  const [config, setConfig] = useState<ProcessNotificationConfig>(
    structuredClone(DEFAULT_CONFIG),
  );

  // 포인트별 오버라이드: mode가 "default"이면 전역 기본값 사용
  const [pointOverrides, setPointOverrides] = useState<
    Record<string, { mode: NotifyMode | "default"; customMessage: string }>
  >({});

  // -------------------------------------------------------------------------
  // 서버에서 불러온 설정을 폼에 반영
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!settings) return;
    const map = settingsToMap(settings);
    const raw = map["notification_process_config"];
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<ProcessNotificationConfig>;
      const merged: ProcessNotificationConfig = {
        ...structuredClone(DEFAULT_CONFIG),
        ...parsed,
        beepSettings: {
          ...DEFAULT_CONFIG.beepSettings,
          ...(parsed.beepSettings ?? {}),
        },
        ttsSettings: {
          ...DEFAULT_CONFIG.ttsSettings,
          ...(parsed.ttsSettings ?? {}),
        },
        points: { ...(parsed.points ?? {}) },
      };
      setConfig(merged);

      // pointOverrides 초기화
      const overrides: Record<
        string,
        { mode: NotifyMode | "default"; customMessage: string }
      > = {};
      for (const [key, val] of Object.entries(merged.points)) {
        overrides[key] = {
          mode: val.mode ?? "default",
          customMessage: val.customMessage ?? "",
        };
      }
      setPointOverrides(overrides);
    } catch {
      // parse 실패 시 기본값 유지
    }
  }, [settings]);

  // -------------------------------------------------------------------------
  // 헬퍼: 포인트 오버라이드 가져오기
  // -------------------------------------------------------------------------
  const getPointOverride = useCallback(
    (key: string) => {
      return (
        pointOverrides[key] ?? {
          mode: "default" as const,
          customMessage: "",
        }
      );
    },
    [pointOverrides],
  );

  const updatePointOverride = useCallback(
    (
      key: string,
      field: "mode" | "customMessage",
      value: string,
    ) => {
      setPointOverrides((prev) => ({
        ...prev,
        [key]: {
          ...getPointOverride(key),
          [field]: value,
        },
      }));
    },
    [getPointOverride],
  );

  // -------------------------------------------------------------------------
  // 저장
  // -------------------------------------------------------------------------
  const handleSave = async () => {
    // pointOverrides -> config.points 변환
    const points: ProcessNotificationConfig["points"] = {};
    for (const [key, override] of Object.entries(pointOverrides)) {
      if (override.mode !== "default" || override.customMessage) {
        points[key] = {
          mode: override.mode === "default" ? config.defaultMode : override.mode,
          ...(override.customMessage
            ? { customMessage: override.customMessage }
            : {}),
        };
      }
    }

    const configToSave: ProcessNotificationConfig = {
      ...config,
      points,
    };

    try {
      await bulkUpdate.mutateAsync([
        {
          key: "notification_process_config",
          value: JSON.stringify(configToSave),
          category: "notification",
          label: "공정별 알림 설정",
        },
      ]);

      // 메모리 캐시에도 반영
      setNotificationConfig(configToSave);
    } catch {
      // useBulkUpdateSettings 내부에서 toast.error 처리
    }
  };

  // -------------------------------------------------------------------------
  // 초기화
  // -------------------------------------------------------------------------
  const handleReset = () => {
    setConfig(structuredClone(DEFAULT_CONFIG));
    setPointOverrides({});
    toast.success("기본값으로 초기화되었습니다.");
  };

  // -------------------------------------------------------------------------
  // 테스트 함수
  // -------------------------------------------------------------------------
  const handleBeepTest = () => {
    playBeep(
      config.beepSettings.frequency,
      config.beepSettings.duration,
      config.beepSettings.volume,
    );
  };

  const handleTtsTest = () => {
    // processNotify를 사용하기 위해 현재 폼 설정을 임시로 적용
    const tempConfig: ProcessNotificationConfig = {
      ...config,
      globalEnabled: true,
      defaultMode: "tts",
      points: {},
    };
    setNotificationConfig(tempConfig);
    processNotify("scanner_logen_complete");
    // 원래 설정 복원 (TTS 재생 후 약간의 딜레이)
    setTimeout(() => {
      setNotificationConfig(config);
    }, 100);
  };

  // -------------------------------------------------------------------------
  // 카테고리별 포인트 필터
  // -------------------------------------------------------------------------
  const getPointsByCategory = (
    category: NotificationCategoryKey,
  ): [NotificationPointKey, (typeof NOTIFICATION_POINTS)[NotificationPointKey]][] => {
    return (
      Object.entries(NOTIFICATION_POINTS) as [
        NotificationPointKey,
        (typeof NOTIFICATION_POINTS)[NotificationPointKey],
      ][]
    ).filter(([, point]) => point.category === category);
  };

  // -------------------------------------------------------------------------
  // 로딩
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* 1. 전역 설정 카드 */}
      {/* ================================================================= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[11px] text-black font-normal">
            <Bell className="h-4 w-4" />
            <span className="text-sm font-semibold">전역 알림 설정</span>
          </CardTitle>
          <CardDescription className="text-[11px] text-black font-normal">
            전체 알림의 기본 동작 방식을 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 알림 사용 */}
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-black font-normal">
              알림 사용
            </Label>
            <Switch
              checked={config.globalEnabled}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, globalEnabled: checked }))
              }
            />
          </div>

          <Separator />

          {/* 기본 알림 방식 */}
          <div className="space-y-3">
            <Label className="text-[11px] text-black font-normal">
              기본 알림 방식
            </Label>
            <RadioGroup
              value={config.defaultMode}
              onValueChange={(value) =>
                setConfig((prev) => ({
                  ...prev,
                  defaultMode: value as NotifyMode,
                }))
              }
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="tts" id="mode-tts" />
                <Label
                  htmlFor="mode-tts"
                  className="text-[11px] text-black font-normal cursor-pointer"
                >
                  TTS 음성
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="beep" id="mode-beep" />
                <Label
                  htmlFor="mode-beep"
                  className="text-[11px] text-black font-normal cursor-pointer"
                >
                  비프음
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="off" id="mode-off" />
                <Label
                  htmlFor="mode-off"
                  className="text-[11px] text-black font-normal cursor-pointer"
                >
                  끄기
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* TTS 설정 */}
          <div className="space-y-4">
            <Label className="text-[11px] text-black font-semibold">
              TTS 설정
            </Label>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Label className="text-[11px] text-black font-normal w-24 shrink-0">
                  TTS 속도
                </Label>
                <Slider
                  value={[config.ttsSettings.rate]}
                  onValueChange={([value]) =>
                    setConfig((prev) => ({
                      ...prev,
                      ttsSettings: { ...prev.ttsSettings, rate: value },
                    }))
                  }
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  className="flex-1"
                />
                <span className="text-[11px] text-black font-normal w-12 text-right">
                  {config.ttsSettings.rate.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* 비프음 설정 */}
          <div className="space-y-4">
            <Label className="text-[11px] text-black font-semibold">
              비프음 설정
            </Label>

            {/* 주파수 */}
            <div className="flex items-center gap-4">
              <Label className="text-[11px] text-black font-normal w-24 shrink-0">
                주파수
              </Label>
              <Slider
                value={[config.beepSettings.frequency]}
                onValueChange={([value]) =>
                  setConfig((prev) => ({
                    ...prev,
                    beepSettings: { ...prev.beepSettings, frequency: value },
                  }))
                }
                min={200}
                max={2000}
                step={10}
                className="flex-1"
              />
              <span className="text-[11px] text-black font-normal w-16 text-right">
                {config.beepSettings.frequency}Hz
              </span>
            </div>

            {/* 길이 */}
            <div className="flex items-center gap-4">
              <Label className="text-[11px] text-black font-normal w-24 shrink-0">
                길이
              </Label>
              <Slider
                value={[config.beepSettings.duration]}
                onValueChange={([value]) =>
                  setConfig((prev) => ({
                    ...prev,
                    beepSettings: { ...prev.beepSettings, duration: value },
                  }))
                }
                min={50}
                max={1000}
                step={10}
                className="flex-1"
              />
              <span className="text-[11px] text-black font-normal w-16 text-right">
                {config.beepSettings.duration}ms
              </span>
            </div>

            {/* 볼륨 */}
            <div className="flex items-center gap-4">
              <Label className="text-[11px] text-black font-normal w-24 shrink-0">
                볼륨
              </Label>
              <Slider
                value={[Math.round(config.beepSettings.volume * 100)]}
                onValueChange={([value]) =>
                  setConfig((prev) => ({
                    ...prev,
                    beepSettings: {
                      ...prev.beepSettings,
                      volume: value / 100,
                    },
                  }))
                }
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-[11px] text-black font-normal w-16 text-right">
                {Math.round(config.beepSettings.volume * 100)}%
              </span>
            </div>
          </div>

          <Separator />

          {/* 테스트 버튼 */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBeepTest}
            >
              <Volume2 className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-[11px]">비프음 테스트</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTtsTest}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-[11px]">TTS 테스트</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================= */}
      {/* 2. 카테고리별 알림 지점 테이블 */}
      {/* ================================================================= */}
      {(
        Object.entries(NOTIFICATION_CATEGORIES) as [
          NotificationCategoryKey,
          string,
        ][]
      ).map(([categoryKey, categoryLabel]) => {
        const points = getPointsByCategory(categoryKey);
        if (points.length === 0) return null;

        return (
          <Card key={categoryKey}>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-black">
                {categoryLabel}
              </CardTitle>
              <CardDescription className="text-[11px] text-black font-normal">
                {categoryLabel} 관련 알림 지점을 개별 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] text-black font-semibold w-[140px]">
                      알림 지점
                    </TableHead>
                    <TableHead className="text-[11px] text-black font-semibold w-[200px]">
                      기본 메시지
                    </TableHead>
                    <TableHead className="text-[11px] text-black font-semibold w-[140px]">
                      알림 방식
                    </TableHead>
                    <TableHead className="text-[11px] text-black font-semibold">
                      커스텀 메시지
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {points.map(([pointKey, pointDef]) => {
                    const override = getPointOverride(pointKey);
                    // 커스텀 메시지 활성화: mode가 tts이거나 default(전역이 tts인 경우)
                    const effectiveMode =
                      override.mode === "default"
                        ? config.defaultMode
                        : override.mode;
                    const isMessageEnabled = effectiveMode === "tts";

                    return (
                      <TableRow key={pointKey}>
                        {/* 알림 지점 */}
                        <TableCell className="text-[11px] text-black font-normal">
                          {pointDef.label}
                        </TableCell>

                        {/* 기본 메시지 */}
                        <TableCell className="text-[11px] text-black font-normal">
                          {pointDef.defaultMessage}
                        </TableCell>

                        {/* 알림 방식 */}
                        <TableCell>
                          <Select
                            value={override.mode}
                            onValueChange={(value) =>
                              updatePointOverride(pointKey, "mode", value)
                            }
                          >
                            <SelectTrigger className="h-8 text-[11px] text-black font-normal w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.entries(MODE_LABELS) as [
                                  NotifyMode | "default",
                                  string,
                                ][]
                              ).map(([modeKey, modeLabel]) => (
                                <SelectItem
                                  key={modeKey}
                                  value={modeKey}
                                  className="text-[11px] text-black font-normal"
                                >
                                  {modeLabel}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* 커스텀 메시지 */}
                        <TableCell>
                          <Input
                            value={override.customMessage}
                            onChange={(e) =>
                              updatePointOverride(
                                pointKey,
                                "customMessage",
                                e.target.value,
                              )
                            }
                            placeholder={pointDef.defaultMessage}
                            disabled={!isMessageEnabled}
                            className="h-8 text-[11px] text-black font-normal"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* ================================================================= */}
      {/* 3. 저장 / 초기화 버튼 */}
      {/* ================================================================= */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          <span className="text-[11px]">초기화</span>
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={bulkUpdate.isPending}
        >
          {bulkUpdate.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          <span className="text-[11px]">저장</span>
        </Button>
      </div>
    </div>
  );
}

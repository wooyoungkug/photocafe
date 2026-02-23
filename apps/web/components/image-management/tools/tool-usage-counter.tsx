'use client';

import { useEffect, useRef } from 'react';
import { Eye, MousePointerClick } from 'lucide-react';
import { useToolUsage } from '@/hooks/use-tool-usage';

interface ToolUsageCounterProps {
  /** 도구 고유 ID (예: 'image-restore', 'image-resize') */
  toolId: string;
  /** 부모 컴포넌트에 trackUse 함수를 전달하기 위한 콜백 */
  onTrackUse?: (trackUse: () => void) => void;
}

/**
 * 도구 사용 카운터 컴포넌트
 *
 * 각 이미지 도구 하단에 배치하여 접속 수/사용 수를 표시합니다.
 * - 마운트 시 접속 카운트 자동 증가 (1회)
 * - 부모에서 `onTrackUse`를 통해 받은 함수로 사용 카운트 증가
 */
export function ToolUsageCounter({ toolId, onTrackUse }: ToolUsageCounterProps) {
  const { stats, trackAccess, trackUse } = useToolUsage(toolId);
  const hasTrackedAccess = useRef(false);

  // 컴포넌트 마운트 시 접속 카운트 1회 증가
  useEffect(() => {
    if (!hasTrackedAccess.current) {
      hasTrackedAccess.current = true;
      trackAccess();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 부모 컴포넌트에 trackUse 함수 전달
  useEffect(() => {
    if (onTrackUse) {
      onTrackUse(trackUse);
    }
  }, [onTrackUse, trackUse]);

  return (
    <div className="flex items-center justify-center gap-4 py-2 text-xs text-slate-400">
      <span className="flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" />
        접속 {stats.accessCount.toLocaleString()}
      </span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="flex items-center gap-1">
        <MousePointerClick className="h-3.5 w-3.5" />
        사용 {stats.useCount.toLocaleString()}
      </span>
    </div>
  );
}

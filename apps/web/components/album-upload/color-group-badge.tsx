'use client';

import { cn } from '@/lib/utils';
import type { PhotoColorInfo, ColorGroup } from '@/lib/color-analysis';

interface ColorGroupBadgeProps {
  colorInfo?: PhotoColorInfo;
  size?: 'sm' | 'md';
}

/**
 * 개별 사진 썸네일에 표시되는 색상 그룹 뱃지
 * 우하단에 작은 원형으로 표시
 */
export function ColorGroupBadge({ colorInfo, size = 'sm' }: ColorGroupBadgeProps) {
  if (!colorInfo) return null;

  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]';

  return (
    <div
      className={cn(
        sizeClass,
        'rounded-full border border-white/80 shadow-sm flex items-center justify-center font-bold text-white'
      )}
      style={{ backgroundColor: colorInfo.colorHex }}
      title={`그룹 ${colorInfo.colorBucketLabel} (${colorInfo.colorNameKo})`}
    >
      {colorInfo.colorBucketLabel}
    </div>
  );
}

interface ColorGroupHeaderProps {
  group: ColorGroup;
}

/**
 * 색상 그룹 구분 헤더
 * 그룹 전환 지점에 삽입되는 구분선
 */
export function ColorGroupHeader({ group }: ColorGroupHeaderProps) {
  return (
    <div className="col-span-full flex items-center gap-2 py-1.5 px-1">
      <div
        className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
        style={{ backgroundColor: group.representativeHex }}
      />
      <span className="text-xs font-medium text-gray-600">
        의상그룹 {group.groupLabel}
      </span>
      <span className="text-xs text-gray-400">
        {group.colorNameKo}계열 {group.fileCount}장
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

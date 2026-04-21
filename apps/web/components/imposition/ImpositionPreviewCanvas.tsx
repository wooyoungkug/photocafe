'use client';

import { ImpositionResult } from '@/hooks/use-imposition';

interface Props {
  result: ImpositionResult | null;
  sheetIndex?: number;
}

/**
 * SVG 기반 임포지션 프리뷰.
 * debounce 150ms 은 호출 측(ImpositionSettingsDialog)에서 적용.
 */
export default function ImpositionPreviewCanvas({ result, sheetIndex = 0 }: Props) {
  if (!result) {
    return (
      <div className="flex items-center justify-center h-[500px] border border-dashed border-gray-300 rounded-lg bg-gray-50">
        <p className="text-[14px] text-black font-normal">설정을 입력하면 프리뷰가 표시됩니다.</p>
      </div>
    );
  }

  const sheet = result.sheets[Math.min(sheetIndex, result.sheets.length - 1)];
  if (!sheet) return null;

  // SVG viewBox = sheet mm
  const sw = result.sheetWidth;
  const sh = result.sheetHeight;
  const margin = result.echo.margin;

  // 실제 인쇄가능영역 (시트 - 4방 여백)
  const usableX = margin.left;
  const usableY = margin.top;
  const usableW = sw - margin.left - margin.right;
  const usableH = sh - margin.top - margin.bottom;

  // 활용률 색
  const util = result.utilization;
  const utilColor = util < 0.5 ? 'text-red-600' : 'text-black';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-[14px] text-black font-normal flex-wrap">
          <span>시트: {sw}×{sh} mm</span>
          <span>·</span>
          <span className="text-blue-600">
            인쇄영역: {usableW}×{usableH} mm
          </span>
          <span>·</span>
          <span>Nup: {result.nup} ({result.cols}×{result.rows})</span>
          <span>·</span>
          <span>회전: {result.rotation}°</span>
          <span>·</span>
          <span className={utilColor}>
            활용률 {(util * 100).toFixed(1)}%
          </span>
        </div>
        <div className="text-[14px] text-black font-normal">
          시트 {sheet.sheetIndex} / {result.sheetCount}
        </div>
      </div>

      <div className="border rounded-lg bg-white p-4 overflow-hidden">
        <svg
          viewBox={`0 0 ${sw} ${sh}`}
          className="w-full h-auto"
          style={{ maxHeight: 500 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 시트 전체 (외곽 = 비인쇄 여백 영역, 옅은 회색) */}
          <rect x={0} y={0} width={sw} height={sh} fill="#f3f4f6" stroke="#94a3b8" strokeWidth={0.6} />
          {/* 실제 인쇄가능영역 (시트 - 4방 여백) — 흰 배경 + 파랑 테두리로 명확히 강조 */}
          <rect
            x={usableX}
            y={usableY}
            width={usableW}
            height={usableH}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={0.6}
            strokeDasharray="3 1.5"
          />
          {/* 인쇄영역 치수 라벨 (좌상단 안쪽) */}
          <text
            x={usableX + 1.5}
            y={usableY + 4.5}
            fontSize={3}
            fill="#2563eb"
            fontFamily="monospace"
          >
            인쇄영역 {usableW}×{usableH}mm
          </text>
          {/* 단위 박스들 */}
          {sheet.placements.map((p, i) => {
            const wStr = Number.isInteger(p.width) ? `${p.width}` : p.width.toFixed(1);
            const hStr = Number.isInteger(p.height) ? `${p.height}` : p.height.toFixed(1);
            const dimFontSize = Math.min(Math.min(p.width, p.height) * 0.055, 4);
            return (
            <g key={i}>
              <rect
                x={p.x}
                y={p.y}
                width={p.width}
                height={p.height}
                fill="#f1f5f9"
                stroke="#64748b"
                strokeWidth={0.4}
              />
              {/* 페이지 번호 라벨 */}
              <text
                x={p.x + p.width / 2}
                y={p.y + p.height / 2}
                fontSize={Math.min(p.width, p.height) * 0.18}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#334155"
                fontFamily="monospace"
              >
                {p.pages.join(' / ')}
              </text>
              {/* 가로(W) 치수 라벨 - 상단 중앙 안쪽 */}
              <text
                x={p.x + p.width / 2}
                y={p.y + dimFontSize + 0.8}
                fontSize={dimFontSize}
                textAnchor="middle"
                fill="#475569"
                fontFamily="monospace"
              >
                ↔ {wStr}mm
              </text>
              {/* 세로(H) 치수 라벨 - 좌측 중앙 안쪽 (90° 회전) */}
              <text
                x={p.x + dimFontSize + 0.8}
                y={p.y + p.height / 2}
                fontSize={dimFontSize}
                textAnchor="middle"
                fill="#475569"
                fontFamily="monospace"
                transform={`rotate(-90, ${p.x + dimFontSize + 0.8}, ${p.y + p.height / 2})`}
              >
                ↕ {hStr}mm
              </text>
              {/* 압축앨범 crease (중앙 점선) */}
              {p.creaseX !== undefined && (
                <line
                  x1={p.creaseX}
                  y1={p.y}
                  x2={p.creaseX}
                  y2={p.y + p.height}
                  stroke="#2563eb"
                  strokeWidth={0.5}
                  strokeDasharray="1.5 1"
                />
              )}
              {/* 타카 여백 음영 */}
              {p.tackEdge && result.echo.tackMargin !== undefined && (
                <TackOverlay p={p} margin={result.echo.tackMargin} />
              )}
            </g>
            );
          })}
          {/* 시트 전체 치수 (외곽 상단/좌측 캘리퍼) */}
          <text
            x={sw / 2}
            y={3.5}
            fontSize={3.5}
            textAnchor="middle"
            fill="#1e293b"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ↔ 시트 {sw}mm
          </text>
          <text
            x={3.5}
            y={sh / 2}
            fontSize={3.5}
            textAnchor="middle"
            fill="#1e293b"
            fontFamily="monospace"
            fontWeight="bold"
            transform={`rotate(-90, 3.5, ${sh / 2})`}
          >
            ↕ 시트 {sh}mm
          </text>
        </svg>
      </div>

      {result.warnings.length > 0 && (
        <ul className="list-disc ml-5 space-y-0.5">
          {result.warnings.map((w, i) => (
            <li key={i} className="text-[14px] text-red-600">
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TackOverlay({
  p,
  margin,
}: {
  p: { x: number; y: number; width: number; height: number; tackEdge?: 'left' | 'right' | 'top' | 'bottom' };
  margin: number;
}) {
  if (!p.tackEdge) return null;
  const edge = p.tackEdge;
  let rect: { x: number; y: number; width: number; height: number };
  if (edge === 'left') rect = { x: p.x, y: p.y, width: margin, height: p.height };
  else if (edge === 'right') rect = { x: p.x + p.width - margin, y: p.y, width: margin, height: p.height };
  else if (edge === 'top') rect = { x: p.x, y: p.y, width: p.width, height: margin };
  else rect = { x: p.x, y: p.y + p.height - margin, width: p.width, height: margin };
  return <rect {...rect} fill="#fde68a" fillOpacity={0.5} />;
}

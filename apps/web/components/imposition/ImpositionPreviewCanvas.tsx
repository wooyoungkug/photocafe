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

  // 활용률 색
  const util = result.utilization;
  const utilColor = util < 0.5 ? 'text-red-600' : 'text-black';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[14px] text-black font-normal">
          <span>시트: {sw}×{sh} mm</span>
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
          {/* 시트 배경 */}
          <rect x={0} y={0} width={sw} height={sh} fill="#ffffff" stroke="#cbd5e1" strokeWidth={0.5} />
          {/* 여백(유효인쇄영역 외곽) */}
          <rect
            x={margin.left}
            y={margin.top}
            width={sw - margin.left - margin.right}
            height={sh - margin.top - margin.bottom}
            fill="none"
            stroke="#e5e7eb"
            strokeDasharray="2 2"
            strokeWidth={0.3}
          />
          {/* 단위 박스들 */}
          {sheet.placements.map((p, i) => (
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
          ))}
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

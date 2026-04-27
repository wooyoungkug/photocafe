'use client';

import { useState, useEffect, useRef } from 'react';
import { ImpositionResult } from '@/hooks/use-imposition';
import { ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';

interface Props {
  result: ImpositionResult | null;
  sheetIndex?: number;
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3, 4];

/**
 * SVG 기반 임포지션 프리뷰.
 * debounce 150ms 은 호출 측(ImpositionSettingsDialog)에서 적용.
 */
export default function ImpositionPreviewCanvas({ result, sheetIndex = 0 }: Props) {
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const zoomIn = () => {
    const idx = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    const next = idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
    setZoom(next);
  };
  const zoomOut = () => {
    const idx = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    const next = idx > 0 ? ZOOM_LEVELS[idx - 1] : ZOOM_LEVELS[0];
    setZoom(next);
  };
  const resetZoom = () => setZoom(1);

  // 손바닥 드래그 팬(pan) 핸들링
  const inlinePanRef = useRef<HTMLDivElement>(null);
  const fullscreenPanRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ active: boolean; startX: number; startY: number; scrollL: number; scrollT: number }>({
    active: false, startX: 0, startY: 0, scrollL: 0, scrollT: 0,
  });

  const onPanStart = (ref: React.RefObject<HTMLDivElement | null>) => (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    // 스크롤 가능한 경우에만 팬 활성화
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
    panState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollL: el.scrollLeft,
      scrollT: el.scrollTop,
    };
    el.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const onPanMove = (ref: React.RefObject<HTMLDivElement | null>) => (e: React.MouseEvent) => {
    if (!panState.current.active) return;
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = panState.current.scrollL - (e.clientX - panState.current.startX);
    el.scrollTop = panState.current.scrollT - (e.clientY - panState.current.startY);
  };

  const onPanEnd = (ref: React.RefObject<HTMLDivElement | null>) => () => {
    panState.current.active = false;
    const el = ref.current;
    if (el) {
      // 스크롤 가능하면 grab, 아니면 default
      const canScroll = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      el.style.cursor = canScroll ? 'grab' : 'default';
    }
  };

  // Esc 키로 전체화면 닫기
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

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

      {/* 확대/축소 컨트롤 */}
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom <= ZOOM_LEVELS[0]}
          className="h-7 w-7 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title="축소"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="h-7 px-2 min-w-[52px] text-[12px] font-medium rounded border border-gray-300 bg-white hover:bg-gray-50"
          title="100%로 재설정"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
          className="h-7 w-7 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title="확대"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="h-7 w-7 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50"
          title="전체화면"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={inlinePanRef}
        className="border rounded-lg bg-white p-4 overflow-auto select-none"
        style={{ maxHeight: 560, cursor: zoom > 1 ? 'grab' : 'default' }}
        onMouseDown={onPanStart(inlinePanRef)}
        onMouseMove={onPanMove(inlinePanRef)}
        onMouseUp={onPanEnd(inlinePanRef)}
        onMouseLeave={onPanEnd(inlinePanRef)}
      >
        <svg
          viewBox={`0 0 ${sw} ${sh}`}
          style={{
            width: `${100 * zoom}%`,
            height: 'auto',
            maxHeight: zoom === 1 ? 500 : undefined,
            display: 'block',
            margin: '0 auto',
            pointerEvents: 'none',
          }}
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
          {sheet.placements.map((p, i) => renderPlacement(p, i, result))}
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

      {/* 전체화면 오버레이 */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6"
          onClick={() => setFullscreen(false)}
        >
          <div
            ref={fullscreenPanRef}
            className="relative bg-white rounded-lg shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] p-6 overflow-auto select-none"
            style={{ cursor: 'grab' }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={onPanStart(fullscreenPanRef)}
            onMouseMove={onPanMove(fullscreenPanRef)}
            onMouseUp={onPanEnd(fullscreenPanRef)}
            onMouseLeave={onPanEnd(fullscreenPanRef)}
          >
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="absolute top-3 right-3 h-9 w-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 z-10"
              title="닫기 (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 text-[14px] text-black font-normal flex-wrap mb-3 pr-12">
              <span>시트: {sw}×{sh} mm</span>
              <span>·</span>
              <span className="text-blue-600">인쇄영역: {usableW}×{usableH} mm</span>
              <span>·</span>
              <span>Nup: {result.nup} ({result.cols}×{result.rows})</span>
              <span>·</span>
              <span>회전: {result.rotation}°</span>
              <span>·</span>
              <span className={utilColor}>활용률 {(util * 100).toFixed(1)}%</span>
            </div>
            <svg
              viewBox={`0 0 ${sw} ${sh}`}
              className="w-full h-auto"
              style={{ maxHeight: 'calc(95vh - 120px)' }}
              preserveAspectRatio="xMidYMid meet"
            >
              <rect x={0} y={0} width={sw} height={sh} fill="#f3f4f6" stroke="#94a3b8" strokeWidth={0.6} />
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
              <text x={usableX + 1.5} y={usableY + 4.5} fontSize={3} fill="#2563eb" fontFamily="monospace">
                인쇄영역 {usableW}×{usableH}mm
              </text>
              {sheet.placements.map((p, i) => renderPlacement(p, i, result))}
              <text x={sw / 2} y={3.5} fontSize={3.5} textAnchor="middle" fill="#1e293b" fontFamily="monospace" fontWeight="bold">
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
        </div>
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

/**
 * 단위박스(placement) 렌더링 — rotation에 따라 페이지 라벨과 crease 방향 자동 조정.
 * - rotation=0: 페어가 가로(좌/우) 배치 → crease 수직, 라벨 좌우 분할
 * - rotation=90: 페어가 세로(위/아래) 배치 → crease 수평, 라벨 상하 분할 (위=1, 아래=2)
 */
function renderPlacement(p: any, i: number, result: ImpositionResult) {
  const wStr = Number.isInteger(p.width) ? `${p.width}` : p.width.toFixed(1);
  const hStr = Number.isInteger(p.height) ? `${p.height}` : p.height.toFixed(1);
  const dimFontSize = Math.min(Math.min(p.width, p.height) * 0.055, 4);
  const isRotated = p.rotation === 90;
  const isPair = p.isPair === true && p.pages.length === 2;
  const labelFontSize = Math.min(p.width, p.height) * 0.18;

  return (
    <g key={i}>
      <rect x={p.x} y={p.y} width={p.width} height={p.height} fill="#f1f5f9" stroke="#64748b" strokeWidth={0.4} />

      {/* 페이지 번호 라벨 — rotation에 따라 페어 분할 방향 + 숫자 회전 모두 반영
          (실제 인쇄물의 물리적 방향을 그대로 시각화)
          rotation=90 CW: 원래 [1|2] 가 [2위/1아래]로 회전 */}
      {isPair ? (
        isRotated ? (
          // rotation=90 페어: 세로 분할, 위=페이지[1], 아래=페이지[0] (CW 회전) + 숫자 -90° 회전
          <>
            <text
              x={p.x + p.width / 2}
              y={p.y + p.height * 0.25}
              fontSize={labelFontSize}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#334155"
              fontFamily="monospace"
              transform={`rotate(-90, ${p.x + p.width / 2}, ${p.y + p.height * 0.25})`}
            >
              {p.pages[1]}
            </text>
            <text
              x={p.x + p.width / 2}
              y={p.y + p.height * 0.75}
              fontSize={labelFontSize}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#334155"
              fontFamily="monospace"
              transform={`rotate(-90, ${p.x + p.width / 2}, ${p.y + p.height * 0.75})`}
            >
              {p.pages[0]}
            </text>
          </>
        ) : (
          // rotation=0 페어: 가로 분할 (왼쪽=페이지[0], 오른쪽=페이지[1])
          <>
            <text
              x={p.x + p.width * 0.25}
              y={p.y + p.height / 2}
              fontSize={labelFontSize}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#334155"
              fontFamily="monospace"
            >
              {p.pages[0]}
            </text>
            <text
              x={p.x + p.width * 0.75}
              y={p.y + p.height / 2}
              fontSize={labelFontSize}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#334155"
              fontFamily="monospace"
            >
              {p.pages[1]}
            </text>
          </>
        )
      ) : (
        // 단일(또는 3+)페이지: 중앙에 합친 라벨 (rotation=90이면 함께 회전)
        <text
          x={p.x + p.width / 2}
          y={p.y + p.height / 2}
          fontSize={labelFontSize}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#334155"
          fontFamily="monospace"
          transform={isRotated ? `rotate(-90, ${p.x + p.width / 2}, ${p.y + p.height / 2})` : undefined}
        >
          {p.pages.join(' / ')}
        </text>
      )}

      {/* 가로(W) 치수 라벨 */}
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
      {/* 세로(H) 치수 라벨 */}
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

      {/* 압축앨범 crease — rotation에 따라 방향 결정
          rotation=0: 수직(가로 중앙, creaseX) / rotation=90: 수평(세로 중앙, creaseY) */}
      {(p.creaseX !== undefined || p.creaseY !== undefined) && (
        isRotated ? (
          <line
            x1={p.x}
            y1={p.y + p.height / 2}
            x2={p.x + p.width}
            y2={p.y + p.height / 2}
            stroke="#2563eb"
            strokeWidth={0.5}
            strokeDasharray="1.5 1"
          />
        ) : (
          <line
            x1={p.x + p.width / 2}
            y1={p.y}
            x2={p.x + p.width / 2}
            y2={p.y + p.height}
            stroke="#2563eb"
            strokeWidth={0.5}
            strokeDasharray="1.5 1"
          />
        )
      )}

      {/* 타카 여백 음영 */}
      {p.tackEdge && result.echo.tackMargin !== undefined && (
        <TackOverlay p={p} margin={result.echo.tackMargin} />
      )}
    </g>
  );
}

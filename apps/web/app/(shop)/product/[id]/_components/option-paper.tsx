'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ProductPaper } from '@/lib/types';

interface OptionPaperProps {
  papers: ProductPaper[];
  selectedPaperId?: string;
  printMethod: 'indigo' | 'inkjet';
  colorMode: '4c' | '6c';
  onSelectPaper: (paper: ProductPaper) => void;
  onChangePrintMethod: (
    method: 'indigo' | 'inkjet',
    colorMode: '4c' | '6c',
    defaultPaper: ProductPaper | undefined
  ) => void;
}

const getPaperType = (name: string) =>
  name.replace(/\s*\d+g?$/i, '').replace(/\s+\d+$/, '').trim();

export function OptionPaper({
  papers, selectedPaperId, printMethod, colorMode, onSelectPaper, onChangePrintMethod,
}: OptionPaperProps) {
  const activePapers = papers.filter(p => p.isActive !== false);

  const hasIndigoPapers = activePapers.some(p => p.printMethod === 'indigo');
  const hasInkjetPapers = activePapers.some(p => p.printMethod === 'inkjet');
  const showMethodSelector = hasIndigoPapers || hasInkjetPapers;

  const filteredPapers = showMethodSelector
    ? activePapers.filter(p => p.printMethod === printMethod)
    : activePapers;

  const selectedPaper = filteredPapers.find(p => p.id === selectedPaperId);

  const [currentPaperType, setCurrentPaperType] = useState<string | null>(
    selectedPaper ? getPaperType(selectedPaper.name) : null
  );

  useEffect(() => {
    if (selectedPaper) {
      setCurrentPaperType(getPaperType(selectedPaper.name));
    } else {
      setCurrentPaperType(null);
    }
  }, [selectedPaperId, printMethod]);

  if (activePapers.length === 0) return null;

  const paperTypes = Array.from(new Set(filteredPapers.map(p => getPaperType(p.name))));
  const papersForType = currentPaperType
    ? filteredPapers.filter(p => getPaperType(p.name) === currentPaperType)
    : [];

  const handlePaperTypeSelect = (type: string) => {
    setCurrentPaperType(type);
    const typePapers = filteredPapers.filter(p => getPaperType(p.name) === type);
    const defaultPaper = typePapers.find(p => p.isDefault) || typePapers[0];
    if (defaultPaper) onSelectPaper(defaultPaper);
  };

  const indigoButtons: { label: string; mode: '4c' | '6c' }[] = [
    { label: '인디고 4도', mode: '4c' },
    { label: '인디고 6도', mode: '6c' },
  ];

  return (
    <div className="space-y-2">
      {/* Step 1: 출력방식 선택 */}
      {showMethodSelector && (
        <div className="flex flex-wrap gap-1.5">
          {/* 인디고 용지가 있으면 4도/6도 구분 버튼 표시 */}
          {hasIndigoPapers && indigoButtons.map(({ label, mode }) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                const p = activePapers.filter(x => x.printMethod === 'indigo');
                onChangePrintMethod('indigo', mode, p.find(x => x.isDefault) || p[0]);
              }}
              className={cn(
                'text-xs px-3 py-1.5 rounded-md border font-medium transition-colors',
                printMethod === 'indigo' && colorMode === mode
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              )}
            >
              {label}
            </button>
          ))}
          {/* 잉크젯 용지가 있으면 버튼 표시 */}
          {hasInkjetPapers && (
            <button
              type="button"
              onClick={() => {
                const p = activePapers.filter(x => x.printMethod === 'inkjet');
                onChangePrintMethod('inkjet', '4c', p.find(x => x.isDefault) || p[0]);
              }}
              className={cn(
                'text-xs px-3 py-1.5 rounded-md border font-medium transition-colors',
                printMethod === 'inkjet'
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              )}
            >
              잉크젯
            </button>
          )}
        </div>
      )}

      {filteredPapers.length === 0 ? (
        <p className="text-xs text-gray-400">해당 출력방식의 용지가 없습니다</p>
      ) : (
        <>
          {/* Step 2: 용지 종류 선택 */}
          <div className="flex flex-wrap gap-1.5">
            {paperTypes.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handlePaperTypeSelect(type)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-md border font-medium transition-colors',
                  currentPaperType === type
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 text-gray-500 hover:border-gray-400'
                )}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Step 3: 평량(g) 선택 - 인디고만 표시, 잉크젯은 스킵 */}
          {printMethod !== 'inkjet' && currentPaperType && papersForType.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {papersForType.map(paper => (
                <button
                  key={paper.id}
                  type="button"
                  onClick={() => onSelectPaper(paper)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-md border font-medium transition-colors',
                    selectedPaperId === paper.id
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
                  )}
                >
                  {paper.grammage ? `${paper.grammage}g` : paper.name}
                  {paper.price > 0 && (
                    <span className="ml-1 text-[10px] opacity-70">
                      +{paper.price.toLocaleString()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

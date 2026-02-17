'use client';

import { cn } from '@/lib/utils';
import type { ProductPaper } from '@/lib/types';

interface OptionPaperProps {
  papers: ProductPaper[];
  selectedPaperId?: string;
  printMethod: 'indigo' | 'inkjet';
  onSelectPaper: (paper: ProductPaper) => void;
  onChangePrintMethod: (method: 'indigo' | 'inkjet', defaultPaper: ProductPaper | undefined) => void;
}

export function OptionPaper({
  papers, selectedPaperId, printMethod, onSelectPaper, onChangePrintMethod,
}: OptionPaperProps) {
  const activePapers = papers.filter(p => p.isActive !== false);
  if (activePapers.length === 0) return null;

  const hasIndigoPapers = activePapers.some(p => p.printMethod === 'indigo');
  const hasInkjetPapers = activePapers.some(p => p.printMethod === 'inkjet');
  const hasBothMethods = hasIndigoPapers && hasInkjetPapers;

  const filteredPapers = (hasIndigoPapers || hasInkjetPapers)
    ? activePapers.filter(p => p.printMethod === printMethod) : activePapers;

  const getPaperType = (name: string) => name.replace(/\s*\d+g?$/i, '').replace(/\s+\d+$/, '').trim();

  const paperGroups = filteredPapers.reduce((groups, paper) => {
    const type = getPaperType(paper.name);
    if (!groups[type]) groups[type] = [];
    groups[type].push(paper);
    return groups;
  }, {} as Record<string, typeof filteredPapers>);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {hasBothMethods && (
        <>
          <button type="button" onClick={() => {
            const p = activePapers.filter(p => p.printMethod === 'indigo');
            onChangePrintMethod('indigo', p.find(x => x.isDefault) || p[0]);
          }} className={cn('text-xs px-2 py-1 rounded border transition-colors',
            printMethod === 'indigo' ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-500')}>
            인디고
          </button>
          <button type="button" onClick={() => {
            const p = activePapers.filter(p => p.printMethod === 'inkjet');
            onChangePrintMethod('inkjet', p.find(x => x.isDefault) || p[0]);
          }} className={cn('text-xs px-2 py-1 rounded border transition-colors',
            printMethod === 'inkjet' ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-500')}>
            잉크젯
          </button>
          <span className="text-gray-300">|</span>
        </>
      )}

      {filteredPapers.length === 0 ? (
        <p className="text-xs text-gray-400">해당 출력방식의 용지가 없습니다</p>
      ) : (
        Object.entries(paperGroups).map(([type, groupPapers]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{type}</span>
            {groupPapers.map((paper) => (
              <button key={paper.id} type="button" onClick={() => onSelectPaper(paper)}
                className={cn('px-2.5 py-1 text-xs rounded border transition-colors',
                  selectedPaperId === paper.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-400')}>
                {paper.grammage ? `${paper.grammage}g` : paper.name}
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

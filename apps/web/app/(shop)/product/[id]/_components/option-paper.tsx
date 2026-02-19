'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const getPaperLabel = (paper: ProductPaper) => {
  const grammageStr = paper.grammage ? `${paper.grammage}g` : '';
  const grammage = grammageStr && !paper.name.includes(grammageStr) ? ` ${grammageStr}` : '';
  const price = paper.price > 0 ? ` (+${paper.price.toLocaleString()}원)` : '';
  return `${paper.name}${grammage}${price}`;
};

type PrintMethodValue = 'indigo_4c' | 'indigo_6c' | 'inkjet';

export function OptionPaper({
  papers, selectedPaperId, printMethod, colorMode, onSelectPaper, onChangePrintMethod,
}: OptionPaperProps) {
  // 인디고는 도수별 isActive4/isActive6로, 그 외는 isActive로 활성 여부 판단
  const isIndigoPaperActive = (p: ProductPaper, mode: '4c' | '6c') =>
    mode === '6c' ? p.isActive6 !== false : p.isActive4 !== false;

  const has4doPapers = papers.some(p => p.printMethod === 'indigo' && isIndigoPaperActive(p, '4c'));
  const has6doPapers = papers.some(p => p.printMethod === 'indigo' && isIndigoPaperActive(p, '6c'));
  const hasIndigoPapers = has4doPapers || has6doPapers;
  const hasInkjetPapers = papers.some(p => p.printMethod === 'inkjet' && p.isActive !== false);
  const showMethodSelector = hasIndigoPapers || hasInkjetPapers;

  // 현재 선택된 출력방식·도수에 맞는 용지 목록
  const filteredPapers = papers.filter(p => {
    if (p.printMethod !== printMethod) return false;
    if (p.printMethod === 'indigo') return isIndigoPaperActive(p, colorMode);
    return p.isActive !== false;
  });

  if (!hasIndigoPapers && !hasInkjetPapers && papers.every(p => p.isActive === false)) return null;

  const methodValue: PrintMethodValue = printMethod === 'inkjet' ? 'inkjet' : colorMode === '6c' ? 'indigo_6c' : 'indigo_4c';

  const handleMethodChange = (value: string) => {
    if (value === 'inkjet') {
      const p = papers.filter(x => x.printMethod === 'inkjet' && x.isActive !== false);
      onChangePrintMethod('inkjet', '4c', p.find(x => x.isDefault) || p[0]);
    } else {
      const mode = value === 'indigo_6c' ? '6c' : '4c';
      const p = papers.filter(x => x.printMethod === 'indigo' && isIndigoPaperActive(x, mode));
      onChangePrintMethod('indigo', mode, p.find(x => x.isDefault) || p[0]);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap min-w-0">
        {showMethodSelector && (
          <Select value={methodValue} onValueChange={handleMethodChange}>
            <SelectTrigger className="w-fit flex-shrink-0 h-9 text-[10pt] border-primary bg-transparent text-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {has4doPapers && (
                <SelectItem value="indigo_4c" className="text-[10pt]">인디고 4도</SelectItem>
              )}
              {has6doPapers && (
                <SelectItem value="indigo_6c" className="text-[10pt]">인디고 6도</SelectItem>
              )}
              {hasInkjetPapers && (
                <SelectItem value="inkjet" className="text-[10pt]">잉크젯</SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
        {filteredPapers.length === 0 ? (
          <p className="text-xs text-gray-400 self-center">해당 출력방식의 용지가 없습니다</p>
        ) : (
          <Select
            value={selectedPaperId || ''}
            onValueChange={(value) => {
              const paper = filteredPapers.find(p => p.id === value);
              if (paper) onSelectPaper(paper);
            }}
          >
            <SelectTrigger className={cn(
              'w-fit h-9 text-[10pt]',
              selectedPaperId
                ? 'border-primary bg-transparent text-gray-900'
                : '',
            )}>
              <SelectValue placeholder="용지를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {filteredPapers.map(paper => (
                <SelectItem key={paper.id} value={paper.id} className="text-[10pt]">
                  {getPaperLabel(paper)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
    </div>
  );
}

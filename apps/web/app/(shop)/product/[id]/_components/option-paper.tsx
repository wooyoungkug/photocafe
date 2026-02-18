'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const activePapers = papers.filter(p => p.isActive !== false);

  const hasIndigoPapers = activePapers.some(p => p.printMethod === 'indigo');
  const hasInkjetPapers = activePapers.some(p => p.printMethod === 'inkjet');
  const showMethodSelector = hasIndigoPapers || hasInkjetPapers;

  const filteredPapers = showMethodSelector
    ? activePapers.filter(p => p.printMethod === printMethod)
    : activePapers;

  if (activePapers.length === 0) return null;

  const methodValue: PrintMethodValue = printMethod === 'inkjet' ? 'inkjet' : colorMode === '6c' ? 'indigo_6c' : 'indigo_4c';

  const handleMethodChange = (value: string) => {
    if (value === 'inkjet') {
      const p = activePapers.filter(x => x.printMethod === 'inkjet');
      onChangePrintMethod('inkjet', '4c', p.find(x => x.isDefault) || p[0]);
    } else {
      const mode = value === 'indigo_6c' ? '6c' : '4c';
      const p = activePapers.filter(x => x.printMethod === 'indigo');
      onChangePrintMethod('indigo', mode, p.find(x => x.isDefault) || p[0]);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap min-w-0">
        {showMethodSelector && (
          <Select value={methodValue} onValueChange={handleMethodChange}>
            <SelectTrigger className="w-fit flex-shrink-0 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hasIndigoPapers && (
                <>
                  <SelectItem value="indigo_4c" className="text-sm">인디고 4도</SelectItem>
                  <SelectItem value="indigo_6c" className="text-sm">인디고 6도</SelectItem>
                </>
              )}
              {hasInkjetPapers && (
                <SelectItem value="inkjet" className="text-sm">잉크젯</SelectItem>
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
            <SelectTrigger className="w-fit h-9 text-sm">
              <SelectValue placeholder="용지를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {filteredPapers.map(paper => (
                <SelectItem key={paper.id} value={paper.id} className="text-sm">
                  {getPaperLabel(paper)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
    </div>
  );
}

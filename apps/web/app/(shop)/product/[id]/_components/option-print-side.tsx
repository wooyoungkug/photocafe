'use client';

import { useTranslations } from 'next-intl';

interface OptionPrintSideProps {
  printSide?: 'single' | 'double';
  bindingName?: string;
  customerSelectable?: boolean;
  onChangePrintSide?: (side: 'single' | 'double') => void;
}

export function OptionPrintSide({ printSide, bindingName, customerSelectable, onChangePrintSide }: OptionPrintSideProps) {
  const t = useTranslations('product');

  // 고객선택 모드: 단면/양면 라디오 버튼 표시
  if (customerSelectable) {
    return (
      <div className="flex items-center gap-3 mt-1">
        <span className="text-[10pt] text-gray-500">{t('printSection')}:</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="printSide"
            checked={printSide === 'single'}
            onChange={() => onChangePrintSide?.('single')}
            className="w-3.5 h-3.5 text-blue-600"
          />
          <span className="text-[10pt]">{t('singleSided')}</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="printSide"
            checked={printSide === 'double'}
            onChange={() => onChangePrintSide?.('double')}
            className="w-3.5 h-3.5 text-blue-600"
          />
          <span className="text-[10pt]">{t('doubleSided')}</span>
        </label>
      </div>
    );
  }

  // 기존 읽기 전용 모드 (제본에 의해 자동 결정)
  const isCompression = bindingName?.includes('압축') || bindingName?.includes('맞장') || bindingName?.includes('레이플릿');
  const isPhotoBook = bindingName?.includes('화보') || bindingName?.includes('포토북');

  const label = printSide === 'single' ? t('singleSided') : t('doubleSided');
  const reason = isCompression ? t('singleSidedFixed') : isPhotoBook ? t('doubleSidedFixed') : t('autoByBinding');

  return (
    <p className="text-[10pt] text-gray-700">
      <span className="font-medium">{label}</span>
      <span className="text-xs text-gray-400 ml-2">{reason}</span>
    </p>
  );
}

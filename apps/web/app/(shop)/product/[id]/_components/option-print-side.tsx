'use client';

import { useTranslations } from 'next-intl';

interface OptionPrintSideProps {
  printSide?: 'single' | 'double';
  bindingName?: string;
}

export function OptionPrintSide({ printSide, bindingName }: OptionPrintSideProps) {
  const t = useTranslations('product');

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

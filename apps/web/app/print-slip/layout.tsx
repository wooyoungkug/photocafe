import type { Metadata } from 'next';

/** 인쇄 시 브라우저 머리글(제목)에 URL 대신 짧은 제목이 나가도록 */
export const metadata: Metadata = {
  title: { absolute: '작업 지시서' },
};

export default function PrintSlipLayout({ children }: { children: React.ReactNode }) {
  return children;
}

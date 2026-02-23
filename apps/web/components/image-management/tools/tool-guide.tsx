'use client';

import { HelpCircle } from 'lucide-react';

interface ToolGuideProps {
  title: string;
  children: React.ReactNode;
}

export function ToolGuide({ title, children }: ToolGuideProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700">
        <HelpCircle className="h-4 w-4 shrink-0" />
        <span>{title}</span>
      </div>
      <div className="px-4 pb-4 border-t border-blue-200/60">
        {children}
      </div>
    </div>
  );
}

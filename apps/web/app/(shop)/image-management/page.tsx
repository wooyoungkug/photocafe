'use client';

import Link from 'next/link';
import { Sparkles, BookOpen, Wrench } from 'lucide-react';

const tools = [
  {
    title: '이미지 보정',
    description: '이미지 복원(선명도+업스케일) 및 해상도·사이즈 조절',
    href: '/image-management/enhancement',
    icon: Sparkles,
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    title: '앨범 편집도구',
    description: '첫장·막장 분리, 늘리기, JPG 합치기, 이미지 자르기',
    href: '/image-management/album-tools',
    icon: BookOpen,
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    title: '유틸리티',
    description: 'PDF 변환 및 비율 계산기',
    href: '/image-management/utilities',
    icon: Wrench,
    gradient: 'from-amber-500 to-orange-600',
  },
];

export default function ImageManagementPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-12">
        <p className="text-neutral-400 tracking-[0.3em] text-xs uppercase mb-3">PHOTO美 Image Tools</p>
        <h1 className="text-4xl font-bold text-neutral-900 mb-3">이미지 도구</h1>
        <p className="text-neutral-500">인쇄용 이미지 편집 및 변환 도구 모음</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group block rounded-2xl bg-white border border-neutral-200 p-8 hover:shadow-lg hover:border-neutral-300 transition-all"
          >
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${tool.gradient} text-white mb-5 shadow-md`}>
              <tool.icon className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-2 group-hover:text-blue-600 transition-colors">
              {tool.title}
            </h2>
            <p className="text-sm text-neutral-500 leading-relaxed">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

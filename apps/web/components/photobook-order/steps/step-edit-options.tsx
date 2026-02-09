'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  usePhotobookOrderStore,
  type EditStyle,
  type BindingDirection,
} from '@/stores/photobook-order-store';
import { FileText, BookOpen, ArrowRight, ArrowLeft } from 'lucide-react';

const BINDING_OPTIONS: { value: BindingDirection; label: string; desc: string }[] = [
  { value: 'LEFT_START_RIGHT_END', label: '좌시우끝', desc: '일반적인 좌철 (한국어 기본)' },
  { value: 'LEFT_START_LEFT_END', label: '좌시좌끝', desc: '좌철 인데 마지막도 왼쪽' },
  { value: 'RIGHT_START_LEFT_END', label: '우시좌끝', desc: '우철 (일본어/아랍어)' },
  { value: 'RIGHT_START_RIGHT_END', label: '우시우끝', desc: '우철 인데 마지막도 오른쪽' },
];

export function StepEditOptions() {
  const { editStyle, bindingDirection, setEditStyle, setBindingDirection } =
    usePhotobookOrderStore();

  return (
    <div className="space-y-6">
      {/* 출력 방식 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <span className="font-medium text-blue-800">인디고 양면출력</span>
        <span className="text-blue-600 ml-2">화보는 인디고 양면출력 전용입니다.</span>
      </div>

      {/* 편집 스타일 */}
      <div>
        <Label className="text-base font-medium mb-3 block">페이지 편집 방식</Label>
        <RadioGroup
          value={editStyle}
          onValueChange={(v) => setEditStyle(v as EditStyle)}
          className="grid grid-cols-2 gap-4"
        >
          <label
            className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              editStyle === 'SINGLE'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <RadioGroupItem value="SINGLE" id="single" />
            <FileText className="w-6 h-6 text-gray-600" />
            <div>
              <div className="font-medium">낱장</div>
              <div className="text-xs text-gray-500">1파일 = 1페이지</div>
            </div>
          </label>

          <label
            className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              editStyle === 'SPREAD'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <RadioGroupItem value="SPREAD" id="spread" />
            <BookOpen className="w-6 h-6 text-gray-600" />
            <div>
              <div className="font-medium">펼침면</div>
              <div className="text-xs text-gray-500">1파일 = 2페이지</div>
            </div>
          </label>
        </RadioGroup>
      </div>

      {/* 제본 방향 */}
      <div>
        <Label className="text-base font-medium mb-3 block">제본 순서</Label>
        <RadioGroup
          value={bindingDirection}
          onValueChange={(v) => setBindingDirection(v as BindingDirection)}
          className="grid grid-cols-2 gap-3"
        >
          {BINDING_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer text-sm transition-colors ${
                bindingDirection === opt.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <RadioGroupItem value={opt.value} id={opt.value} />
              <div className="flex items-center gap-1 text-gray-600">
                {opt.value.startsWith('LEFT') ? (
                  <ArrowRight className="w-4 h-4" />
                ) : (
                  <ArrowLeft className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

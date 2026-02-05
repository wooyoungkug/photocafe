'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { usePhotobookOrderStore, type CoatingType } from '@/stores/photobook-order-store';
import { useFabrics } from '@/hooks/use-fabrics';
import { Search, Loader2 } from 'lucide-react';

const COATING_OPTIONS: { value: CoatingType; label: string; desc: string }[] = [
  { value: 'NONE', label: '무코팅', desc: '코팅 없음' },
  { value: 'MATTE', label: '무광', desc: '부드러운 질감' },
  { value: 'GLOSSY', label: '유광', desc: '광택 효과' },
  { value: 'VELVET', label: '벨벳', desc: '고급 벨벳 질감' },
];

export function StepMaterials() {
  const { fabricId, coatingType, setFabric, setCoating } = usePhotobookOrderStore();
  const [searchTerm, setSearchTerm] = useState('');

  // 원단 목록 조회
  const { data: fabricsData, isLoading } = useFabrics({
    isActive: true,
    forAlbumCover: true,
  });

  const fabrics = fabricsData?.data || [];

  // 검색 필터링
  const filteredFabrics = fabrics.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 원단 선택 */}
      <div>
        <Label className="text-base font-medium mb-3 block">
          원단 (커버 소재) <span className="text-red-500">*</span>
        </Label>

        {/* 검색 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="원단 코드 또는 이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 원단 목록 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
            {filteredFabrics.length === 0 ? (
              <div className="col-span-3 text-center py-4 text-gray-500 text-sm">
                {searchTerm ? '검색 결과가 없습니다' : '등록된 원단이 없습니다'}
              </div>
            ) : (
              filteredFabrics.map((fabric) => (
                <button
                  key={fabric.id}
                  type="button"
                  onClick={() => setFabric(fabric.id, fabric.name)}
                  className={`p-2 text-left border rounded transition-colors ${
                    fabricId === fabric.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {fabric.thumbnailUrl && (
                      <div
                        className="w-8 h-8 rounded border bg-cover bg-center"
                        style={{ backgroundImage: `url(${fabric.thumbnailUrl})` }}
                      />
                    )}
                    {fabric.colorCode && !fabric.thumbnailUrl && (
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: fabric.colorCode }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{fabric.code}</div>
                      <div className="text-xs text-gray-500 truncate">{fabric.name}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {fabricId && (
          <div className="mt-2 text-sm text-blue-600">
            선택: {fabrics.find((f) => f.id === fabricId)?.name}
          </div>
        )}
      </div>

      {/* 코팅 선택 */}
      <div>
        <Label className="text-base font-medium mb-3 block">코팅</Label>
        <RadioGroup
          value={coatingType}
          onValueChange={(v) => setCoating(v as CoatingType, null)}
          className="grid grid-cols-4 gap-3"
        >
          {COATING_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer text-center transition-colors ${
                coatingType === opt.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-xs text-gray-500">{opt.desc}</div>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

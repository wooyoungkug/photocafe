'use client';

import { useState } from 'react';
import { Star, Edit3, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useClientAlbumPreference, useUpsertClientAlbumPreference } from '@/hooks/use-client-album-preference';
import type { ClientAlbumPreference } from '@/lib/types/client';

interface ClientPreferenceCardProps {
  clientId?: string;
  clientName?: string;
  onApplyPreference?: (pref: ClientAlbumPreference) => void;
}

const EDIT_STYLE_LABELS: Record<string, string> = {
  single: '낱장',
  spread: '펼침면',
  SINGLE: '낱장',
  SPREAD: '펼침면',
};

const BINDING_LABELS: Record<string, string> = {
  LEFT_START_RIGHT_END: '좌시우끝',
  LEFT_START_LEFT_END: '좌시좌끝',
  RIGHT_START_LEFT_END: '우시좌끝',
  RIGHT_START_RIGHT_END: '우시우끝',
};

export function ClientPreferenceCard({
  clientId,
  clientName,
  onApplyPreference,
}: ClientPreferenceCardProps) {
  const { data: preference, isLoading } = useClientAlbumPreference(clientId);
  const upsertMutation = useUpsertClientAlbumPreference();
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editInstructions, setEditInstructions] = useState('');

  if (!clientId || isLoading) return null;
  if (!preference) return null;

  const handleEdit = () => {
    setEditNotes(preference.editorNotes || '');
    setEditInstructions(preference.specialInstructions || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    upsertMutation.mutate(
      {
        clientId,
        data: {
          editorNotes: editNotes || undefined,
          specialInstructions: editInstructions || undefined,
        },
      },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const editStyleLabel = preference.preferredEditStyle
    ? EDIT_STYLE_LABELS[preference.preferredEditStyle] || preference.preferredEditStyle
    : null;
  const bindingLabel = preference.preferredBinding
    ? BINDING_LABELS[preference.preferredBinding] || preference.preferredBinding
    : null;

  const infoParts: string[] = [];
  if (editStyleLabel) infoParts.push(`편집: ${editStyleLabel}`);
  if (bindingLabel) infoParts.push(`제본: ${bindingLabel}`);
  if (preference.mostUsedSize) infoParts.push(`규격: ${preference.mostUsedSize}`);

  const statParts: string[] = [];
  if (preference.colorGroupEnabled) statParts.push('의상그룹: 사용');
  if (preference.averagePageCount) statParts.push(`평균 ${preference.averagePageCount}p`);
  if (preference.totalOrders > 0) statParts.push(`총 ${preference.totalOrders}건`);

  return (
    <div className="rounded-lg border bg-amber-50/50 border-amber-200 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="text-sm font-medium text-amber-800">
            {clientName || '이 스튜디오'}의 선호 패턴
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onApplyPreference && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100"
              onClick={() => onApplyPreference(preference)}
            >
              적용
            </Button>
          )}
          {isEditing ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                onClick={handleSave}
                disabled={upsertMutation.isPending}
              >
                <Save className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:bg-gray-100"
                onClick={() => setIsEditing(false)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-100"
              onClick={handleEdit}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {infoParts.length > 0 && (
        <p className="text-xs text-amber-700">
          {infoParts.join(' | ')}
        </p>
      )}
      {statParts.length > 0 && (
        <p className="text-xs text-amber-600/80">
          {statParts.join(' | ')}
        </p>
      )}

      {isEditing ? (
        <div className="mt-2 space-y-2">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-0.5">편집자 메모</label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="편집 시 참고사항..."
              className="text-xs h-16 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-0.5">특별 지시사항</label>
            <Textarea
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              placeholder="특별 요청사항..."
              className="text-xs h-16 resize-none"
            />
          </div>
        </div>
      ) : (
        <>
          {preference.editorNotes && (
            <p className="text-xs text-gray-500 mt-1 italic">
              &quot;{preference.editorNotes}&quot;
            </p>
          )}
          {preference.specialInstructions && (
            <p className="text-xs text-gray-500 italic">
              &quot;{preference.specialInstructions}&quot;
            </p>
          )}
        </>
      )}
    </div>
  );
}

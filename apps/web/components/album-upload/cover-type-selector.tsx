'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Palette, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import {
  type UploadedFolder,
  type CoverSourceType,
  useMultiFolderUploadStore,
  isDesignCoverFileName,
} from '@/stores/multi-folder-upload-store';
import { FabricPickerDialog } from './fabric-picker-dialog';
import type { Fabric } from '@/hooks/use-fabrics';

interface CoverTypeSelectorProps {
  folder: UploadedFolder;
}

export function CoverTypeSelector({ folder }: CoverTypeSelectorProps) {
  const t = useTranslations('folder');
  const tc = useTranslations('common');
  const [showFabricDialog, setShowFabricDialog] = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [pendingSwitchTo, setPendingSwitchTo] = useState<CoverSourceType | null>(null);

  const {
    setFolderCoverSource,
    setFolderFabric,
    clearFolderFabric,
    reclassifyCoverToInner,
  } = useMultiFolderUploadStore();

  // 표지 파일 목록
  const coverFiles = useMemo(
    () => folder.files.filter(f => f.coverType !== 'INNER_PAGE'),
    [folder.files]
  );

  const coverFileNames = useMemo(
    () => coverFiles.map(f => f.fileName).join(', '),
    [coverFiles]
  );

  const hasCoverFiles = coverFiles.length > 0;

  // 원단표지 선택 상태에서 파일명에 표지/커버 키워드가 포함된 파일 존재 여부
  const filesWithCoverKeywords = useMemo(
    () => folder.files.filter(f => isDesignCoverFileName(f.fileName)),
    [folder.files]
  );
  const hasCoverKeywordFiles = filesWithCoverKeywords.length > 0;
  const coverKeywordFileNames = useMemo(
    () => filesWithCoverKeywords.map(f => f.fileName).join(', '),
    [filesWithCoverKeywords]
  );

  const [showAutoSwitchConfirm, setShowAutoSwitchConfirm] = useState(false);

  // 표지 유형 변경 핸들러
  const handleCoverSourceChange = (source: CoverSourceType) => {
    if (source === folder.coverSourceType) return;

    // 원단표지 → 디자인표지 전환 시 표지 파일이 없으면 바로 전환
    if (source === 'design') {
      setFolderCoverSource(folder.id, 'design');
      return;
    }

    // 디자인표지 → 원단표지 전환 시 표지 파일이 있으면 확인
    if (source === 'fabric' && hasCoverFiles) {
      setPendingSwitchTo('fabric');
      setShowSwitchConfirm(true);
      return;
    }

    setFolderCoverSource(folder.id, source);
  };

  // 전환 확인 → 표지 파일을 내지로 재분류
  const handleConfirmSwitch = () => {
    if (pendingSwitchTo === 'fabric') {
      reclassifyCoverToInner(folder.id);
      setFolderCoverSource(folder.id, 'fabric');
    }
    setShowSwitchConfirm(false);
    setPendingSwitchTo(null);
  };

  // 원단 선택 콜백
  const handleFabricSelect = (fabric: Fabric) => {
    setFolderFabric(
      folder.id,
      fabric.id,
      `${fabric.code} ${fabric.name}`,
      fabric.thumbnailUrl || null,
      fabric.basePrice
    );
  };

  return (
    <div className="mt-3 pt-3 border-t">
      {/* 자동 감지 배너 */}
      {folder.coverAutoDetected && folder.coverSourceType === 'design' && (
        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-blue-700 font-medium">
                {t('coverAutoDetectedTitle')}
              </div>
              <div className="text-xs text-blue-600 mt-0.5">
                {t('coverAutoDetectedDesc', { files: coverFileNames })}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs flex-shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={() => handleCoverSourceChange('fabric')}
            >
              {t('switchToFabric')}
            </Button>
          </div>
        </div>
      )}

      {/* 표지 유형 토글 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-600">{t('coverType')}</span>
        {folder.coverAutoDetected && (
          <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600">
            {t('autoDetected')}
          </Badge>
        )}
      </div>

      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
        <button
          type="button"
          onClick={() => handleCoverSourceChange('fabric')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            'flex items-center gap-1.5',
            folder.coverSourceType === 'fabric'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Palette className="w-3.5 h-3.5" />
          {t('fabricCover')}
        </button>
        <button
          type="button"
          onClick={() => handleCoverSourceChange('design')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            'flex items-center gap-1.5',
            folder.coverSourceType === 'design'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          {t('designCover')}
        </button>
      </div>

      {/* 원단표지인데 표지/커버 키워드 파일이 있는 경우 안내 배너 */}
      {folder.coverSourceType === 'fabric' && hasCoverKeywordFiles && (
        <div className="mt-2 mb-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-orange-700 font-medium">
                {t('designCoverAutoSwitchTitle')}
              </div>
              <div className="text-xs text-orange-600 mt-0.5 truncate">
                {coverKeywordFileNames}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs flex-shrink-0 border-orange-300 text-orange-700 hover:bg-orange-100"
              onClick={() => setShowAutoSwitchConfirm(true)}
            >
              {t('designCoverAutoSwitchAction')}
            </Button>
          </div>
        </div>
      )}

      {/* 원단표지 선택 패널 */}
      {folder.coverSourceType === 'fabric' && (
        <div className="mt-2 p-3 bg-amber-50/50 rounded-lg border border-amber-200">
          {folder.selectedFabricId ? (
            <div className="flex items-center gap-3">
              {folder.selectedFabricThumbnail ? (
                <div
                  className="w-12 h-12 rounded-lg border border-amber-300 bg-cover bg-center flex-shrink-0"
                  style={{ backgroundImage: `url(${folder.selectedFabricThumbnail})` }}
                />
              ) : (
                <div className="w-12 h-12 rounded-lg border border-amber-300 bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Palette className="w-5 h-5 text-amber-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {folder.selectedFabricName}
                </div>
                <div className="text-[10px] text-gray-500">
                  {t('fabricCoverSelected')}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-shrink-0"
                onClick={() => setShowFabricDialog(true)}
              >
                {tc('change')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Palette className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-600">{t('selectFabricPrompt')}</div>
                <div className="text-[10px] text-gray-400">{t('selectFabricDesc')}</div>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs bg-amber-600 hover:bg-amber-700 flex-shrink-0"
                onClick={() => setShowFabricDialog(true)}
              >
                {t('selectFabric')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 디자인표지 패널 - 표지/내지 분리 안내 */}
      {folder.coverSourceType === 'design' && (
        <div className="mt-2 p-3 bg-blue-50/50 rounded-lg border border-blue-200">
          {hasCoverFiles ? (
            <div className="flex items-center gap-2">
              <div className="w-1 h-8 bg-blue-500 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-blue-700">
                  {t('designCoverDetected', { count: coverFiles.length })}
                </div>
                <div className="text-[10px] text-blue-600 truncate">
                  {coverFileNames}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              {t('designCoverGuide')}
            </div>
          )}
        </div>
      )}

      {/* 원단 선택 다이얼로그 */}
      <FabricPickerDialog
        open={showFabricDialog}
        onOpenChange={setShowFabricDialog}
        selectedFabricId={folder.selectedFabricId}
        onSelect={handleFabricSelect}
      />

      {/* 전환 확인 다이얼로그 (디자인→원단 시 표지 파일 재분류) */}
      <AlertDialog open={showSwitchConfirm} onOpenChange={setShowSwitchConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('switchCoverConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('switchCoverConfirmDesc', { files: coverFileNames })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch}>
              {t('switchCoverConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 원단표지→디자인표지 자동전환 확인 다이얼로그 */}
      <AlertDialog open={showAutoSwitchConfirm} onOpenChange={setShowAutoSwitchConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('designCoverAutoSwitchTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('designCoverAutoSwitchDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setFolderCoverSource(folder.id, 'design');
              setShowAutoSwitchConfirm(false);
            }}>
              {t('designCoverAutoSwitchAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

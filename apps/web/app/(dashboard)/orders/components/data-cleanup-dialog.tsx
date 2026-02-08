'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DataCleanupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  onConfirm: (data: { startDate: string; endDate: string; deleteThumbnails: boolean }) => void;
}

export function DataCleanupDialog({
  open,
  onOpenChange,
  isLoading,
  onConfirm,
}: DataCleanupDialogProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteThumbnails, setDeleteThumbnails] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            데이터 삭제
          </DialogTitle>
          <DialogDescription>
            지정한 기간의 주문 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start-date">시작일</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="end-date">종료일</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-thumbnails"
              checked={deleteThumbnails}
              onCheckedChange={(checked) => setDeleteThumbnails(checked === true)}
            />
            <Label htmlFor="delete-thumbnails" className="text-sm cursor-pointer">
              썸네일 파일도 함께 삭제
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm({ startDate, endDate, deleteThumbnails })}
            disabled={isLoading || !startDate || !endDate}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            삭제 실행
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

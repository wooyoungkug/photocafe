'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ChangeReceiptDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  isLoading: boolean;
  onConfirm: (date: string) => void;
}

export function ChangeReceiptDateDialog({
  open,
  onOpenChange,
  selectedCount,
  isLoading,
  onConfirm,
}: ChangeReceiptDateDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>접수일 변경</DialogTitle>
          <DialogDescription>
            선택한 {selectedCount}건의 접수일을 변경합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3">
          <Label htmlFor="receipt-date">변경할 접수일</Label>
          <Input
            id="receipt-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            취소
          </Button>
          <Button onClick={() => onConfirm(date)} disabled={isLoading || !date}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            변경
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

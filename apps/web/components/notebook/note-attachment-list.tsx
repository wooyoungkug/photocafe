'use client';

import { useCallback, useRef, useState } from 'react';
import {
  FileText,
  File as FileIcon,
  ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  fetchFreshAttachmentUrl,
  useDeleteNoteAttachment,
  useNoteAttachments,
  useUploadNoteAttachment,
} from '@/hooks/use-note-attachments';
import { cn } from '@/lib/utils';

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function attachmentIcon(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime === 'application/pdf') return FileText;
  return FileIcon;
}

interface NoteAttachmentListProps {
  noteId: string;
}

export function NoteAttachmentList({ noteId }: NoteAttachmentListProps) {
  const { toast } = useToast();
  const { data: attachments = [], isLoading } = useNoteAttachments(noteId);
  const upload = useUploadNoteAttachment();
  const remove = useDeleteNoteAttachment();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      for (const file of arr) {
        try {
          await upload.mutateAsync({ noteId, file });
        } catch (e) {
          toast({
            title: `${file.name} 업로드 실패: ${e instanceof Error ? e.message : '알 수 없음'}`,
            variant: 'destructive',
          });
        }
      }
    },
    [noteId, upload, toast],
  );

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void uploadFiles(e.target.files);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const url = await fetchFreshAttachmentUrl(id);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : '다운로드 실패',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (id: string, fileName: string) => {
    if (!window.confirm(`'${fileName}'을(를) 삭제할까요?`)) return;
    remove.mutate(
      { id, noteId },
      {
        onSuccess: () => toast({ title: '삭제되었습니다.' }),
        onError: (e: Error) =>
          toast({ title: e.message || '삭제 실패', variant: 'destructive' }),
      },
    );
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed p-2 transition-colors',
        dragActive ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white/60',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-black/60 font-bold flex items-center gap-1">
          <Paperclip className="h-3.5 w-3.5" />
          첨부파일
          {attachments.length > 0 && (
            <span className="text-[11px] text-black/40 font-normal">
              ({attachments.length})
            </span>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[12px]"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5 mr-1" />
          )}
          파일 추가
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleSelect}
          aria-label="파일 선택"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-3 text-black/40">
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-center text-[12px] text-black/40 py-2">
          파일을 끌어다 놓거나 "파일 추가" 버튼을 눌러 업로드하세요. (최대 500MB, ZIP 1GB)
        </p>
      ) : (
        <ul className="space-y-1">
          {attachments.map((att) => {
            const Icon = attachmentIcon(att.mimeType);
            return (
              <li
                key={att.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded bg-white border text-[13px] hover:bg-gray-50"
              >
                <Icon className="h-4 w-4 text-black/50 shrink-0" />
                <button
                  type="button"
                  onClick={() => handleDownload(att.id, att.fileName)}
                  className="flex-1 min-w-0 text-left truncate hover:underline"
                  title={att.fileName}
                >
                  {att.fileName}
                </button>
                <span className="text-[11px] text-black/40 tabular-nums shrink-0">
                  {humanSize(att.sizeBytes)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => handleDownload(att.id, att.fileName)}
                  title="다운로드"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(att.id, att.fileName)}
                  disabled={remove.isPending}
                  title="삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateMemo, useMemos } from '@/hooks/use-schedule';
import { NotebookSidebar } from '@/components/notebook/notebook-sidebar';
import { NoteList } from '@/components/notebook/note-list';
import { NoteEditor } from '@/components/notebook/note-editor';

export default function NotebookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const createMemo = useCreateMemo();

  const [selectedKey, setSelectedKey] = useState<string>('all');
  const [search, setSearch] = useState('');
  const noteParam = searchParams.get('note');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(noteParam);

  useEffect(() => {
    setSelectedNoteId(searchParams.get('note'));
  }, [searchParams]);

  const { data: allMemos = [] } = useMemos({});

  const totalCount = allMemos.length;
  const uncategorizedCount = allMemos.filter((m) => !m.notebookId).length;

  const handleSelectNote = useCallback(
    (id: string) => {
      setSelectedNoteId(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set('note', id);
      router.replace(`/schedule/notebook?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleCreateNote = useCallback(() => {
    const notebookId =
      selectedKey === 'all' || selectedKey === 'uncategorized'
        ? null
        : selectedKey.startsWith('nb:')
          ? selectedKey.slice(3)
          : null;
    createMemo.mutate(
      {
        title: '',
        content: '',
        contentFormat: 'html',
        notebookId,
        isPersonal: true,
      } as any,
      {
        onSuccess: (memo: any) => {
          handleSelectNote(memo.id);
        },
        onError: (e: Error) =>
          toast({ title: e.message || '노트 생성 실패', variant: 'destructive' }),
      },
    );
  }, [selectedKey, createMemo, handleSelectNote, toast]);

  const handleNoteDeleted = useCallback(() => {
    setSelectedNoteId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('note');
    const qs = params.toString();
    router.replace(`/schedule/notebook${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, searchParams]);

  const notebookFilter =
    selectedKey === 'all'
      ? 'all'
      : selectedKey === 'uncategorized'
        ? 'uncategorized'
        : selectedKey.startsWith('nb:')
          ? selectedKey.slice(3)
          : 'all';

  return (
    <div className="h-full flex bg-gray-50 rounded-lg overflow-hidden border">
      <NotebookSidebar
        selectedKey={selectedKey}
        onSelect={(k) => {
          setSelectedKey(k);
          // 노트북 변경 시 검색·선택 초기화는 의도적으로 유지(편의)
        }}
        totalCount={totalCount}
        uncategorizedCount={uncategorizedCount}
      />
      <NoteList
        notebookFilter={notebookFilter}
        selectedNoteId={selectedNoteId}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        search={search}
        onSearchChange={setSearch}
      />
      {createMemo.isPending && !selectedNoteId ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <Loader2 className="h-6 w-6 animate-spin text-black/40" />
        </div>
      ) : (
        <NoteEditor noteId={selectedNoteId} onDeleted={handleNoteDeleted} />
      )}
    </div>
  );
}

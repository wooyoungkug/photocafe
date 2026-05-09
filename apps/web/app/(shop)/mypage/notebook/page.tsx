'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateNote, useNotes } from '@/hooks/use-notes';
import { NotebookSidebar } from '@/components/notebook/notebook-sidebar';
import { NoteList } from '@/components/notebook/note-list';
import { NoteEditor } from '@/components/notebook/note-editor';
import { useAuthStore } from '@/stores/auth-store';

export default function ClientNotebookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const createNote = useCreateNote();
  const user = useAuthStore((s) => s.user);

  // enableNote 가드: 본사 admin/staff 는 항상 통과, 스튜디오는 enableNote=true 일 때만 접근 가능
  useEffect(() => {
    if (!user) return;
    const isHostStaff = user.role === 'admin' || user.role === 'staff';
    if (!isHostStaff && !user.enableNote) {
      toast({
        title: '노트장이 비활성화되어 있습니다. 관리자에게 문의해주세요.',
        variant: 'destructive',
      });
      router.replace('/mypage/calendar');
    }
  }, [user, router, toast]);

  const [selectedKey, setSelectedKey] = useState<string>('all');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const noteParam = searchParams.get('note');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(noteParam);

  useEffect(() => {
    setSelectedNoteId(searchParams.get('note'));
  }, [searchParams]);

  const { data: allNotes = [] } = useNotes({});

  const totalCount = allNotes.length;
  const uncategorizedCount = allNotes.filter((m) => !m.notebookId).length;

  const handleSelectNote = useCallback(
    (id: string) => {
      setSelectedNoteId(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set('note', id);
      router.replace(`/mypage/notebook?${params.toString()}`, { scroll: false });
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
    createNote.mutate(
      {
        title: '',
        content: '',
        contentFormat: 'html',
        notebookId,
        isPersonal: true,
      } as any,
      {
        onSuccess: (note: any) => {
          handleSelectNote(note.id);
        },
        onError: (e: Error) =>
          toast({ title: e.message || '노트 생성 실패', variant: 'destructive' }),
      },
    );
  }, [selectedKey, createNote, handleSelectNote, toast]);

  const handleNoteDeleted = useCallback(() => {
    setSelectedNoteId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('note');
    const qs = params.toString();
    router.replace(`/mypage/notebook${qs ? `?${qs}` : ''}`, { scroll: false });
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
        }}
        selectedTagId={selectedTagId}
        onSelectTag={setSelectedTagId}
        totalCount={totalCount}
        uncategorizedCount={uncategorizedCount}
      />
      <NoteList
        notebookFilter={notebookFilter}
        tagFilter={selectedTagId}
        selectedNoteId={selectedNoteId}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        search={search}
        onSearchChange={setSearch}
      />
      {createNote.isPending && !selectedNoteId ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <Loader2 className="h-6 w-6 animate-spin text-black/40" />
        </div>
      ) : (
        <NoteEditor noteId={selectedNoteId} onDeleted={handleNoteDeleted} />
      )}
    </div>
  );
}

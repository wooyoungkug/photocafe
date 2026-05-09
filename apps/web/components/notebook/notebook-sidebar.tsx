'use client';

import { useState } from 'react';
import {
  Book,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Inbox,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  useDeleteNotebook,
  useNotebookTree,
  type NotebookTreeNode,
  type NotebookWithCounts,
} from '@/hooks/use-notebooks';
import { cn } from '@/lib/utils';
import { NotebookEditDialog } from './notebook-edit-dialog';

interface NotebookSidebarProps {
  selectedKey: string;
  onSelect: (key: string) => void;
  totalCount?: number;
  uncategorizedCount?: number;
}

export function NotebookSidebar({
  selectedKey,
  onSelect,
  totalCount,
  uncategorizedCount,
}: NotebookSidebarProps) {
  const { data: tree, isLoading } = useNotebookTree();
  const { toast } = useToast();
  const deleteNb = useDeleteNotebook();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NotebookWithCounts | null>(null);
  const [parentForCreate, setParentForCreate] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateRoot = () => {
    setEditTarget(null);
    setParentForCreate(null);
    setEditOpen(true);
  };

  const handleCreateChild = (parentId: string) => {
    setEditTarget(null);
    setParentForCreate(parentId);
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(parentId);
      return next;
    });
    setEditOpen(true);
  };

  const handleEdit = (nb: NotebookWithCounts) => {
    setEditTarget(nb);
    setParentForCreate(null);
    setEditOpen(true);
  };

  const handleDelete = (nb: NotebookWithCounts) => {
    if (!window.confirm(`'${nb.name}' 노트북을 삭제할까요?`)) return;
    deleteNb.mutate(nb.id, {
      onSuccess: () => {
        toast({ title: '노트북이 삭제되었습니다.' });
        if (selectedKey === `nb:${nb.id}`) onSelect('all');
      },
      onError: (e: Error) => {
        toast({ title: e.message || '삭제에 실패했습니다.', variant: 'destructive' });
      },
    });
  };

  const renderNode = (node: NotebookTreeNode, depth: number) => {
    const key = `nb:${node.id}`;
    const isOpen = expanded.has(node.id);
    const hasChildren = node.children.length > 0;
    const memoCount = node._count?.memos ?? 0;
    return (
      <div key={node.id}>
        <div
          className={cn(
            'group flex items-center gap-1 pr-1 rounded-md text-[14px] transition-colors',
            selectedKey === key
              ? 'bg-red-50 text-red-700'
              : 'text-black hover:bg-gray-100',
          )}
          style={{ paddingLeft: depth * 14 + 4 }}
        >
          <button
            type="button"
            className="w-5 h-7 flex items-center justify-center shrink-0"
            onClick={() => hasChildren && toggle(node.id)}
            aria-label={hasChildren ? (isOpen ? '접기' : '펼치기') : undefined}
          >
            {hasChildren ? (
              isOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )
            ) : null}
          </button>
          <button
            type="button"
            className="flex-1 flex items-center gap-1.5 py-1.5 min-w-0 text-left"
            onClick={() => onSelect(key)}
          >
            <span className="text-[14px] leading-none shrink-0">
              {node.icon ? (
                node.icon
              ) : (
                <Book className="h-3.5 w-3.5" style={{ color: node.color }} />
              )}
            </span>
            <span className="truncate">{node.name}</span>
            <span className="ml-auto text-[11px] text-black/40 tabular-nums">
              {memoCount > 0 ? memoCount : ''}
            </span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="노트북 메뉴"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreateChild(node.id)}>
                <FolderPlus className="h-3.5 w-3.5 mr-2" />
                하위 노트북 추가
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(node)}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                이름·색상 수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(node)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {hasChildren && isOpen && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-60 shrink-0 border-r bg-white flex flex-col min-h-0">
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="text-[14px] text-black font-bold flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-yellow-600" />
          노트장
        </h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreateRoot} title="새 노트북">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <button
          type="button"
          onClick={() => onSelect('all')}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[14px] text-left transition-colors',
            selectedKey === 'all'
              ? 'bg-red-50 text-red-700'
              : 'text-black hover:bg-gray-100',
          )}
        >
          <Inbox className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">모든 노트</span>
          {totalCount !== undefined && (
            <span className="text-[11px] text-black/40 tabular-nums">{totalCount}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelect('uncategorized')}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[14px] text-left transition-colors',
            selectedKey === 'uncategorized'
              ? 'bg-red-50 text-red-700'
              : 'text-black hover:bg-gray-100',
          )}
        >
          <Book className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="flex-1">미분류</span>
          {uncategorizedCount !== undefined && (
            <span className="text-[11px] text-black/40 tabular-nums">{uncategorizedCount}</span>
          )}
        </button>

        <div className="pt-2 mt-2 border-t">
          <p className="px-2 py-1 text-[11px] text-black/40 font-bold uppercase tracking-wide">
            노트북
          </p>
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-black/40">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-4 px-2 text-[12px] text-black/40">
              노트북이 없습니다.
              <br />
              <button
                onClick={handleCreateRoot}
                className="text-red-600 underline mt-1 inline-block"
              >
                새 노트북 만들기
              </button>
            </div>
          ) : (
            tree.map((n) => renderNode(n, 0))
          )}
        </div>
      </div>

      <NotebookEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        parentId={parentForCreate}
        notebook={editTarget}
        onSaved={(id) => {
          if (!editTarget) onSelect(`nb:${id}`);
        }}
      />
    </aside>
  );
}

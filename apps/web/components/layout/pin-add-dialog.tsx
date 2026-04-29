"use client";

import { useMemo, useState } from "react";
import { Search, Pin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  flattenNavigation,
  getFilteredNavigation,
  type FlatMenuEntry,
} from "@/lib/navigation";
import { useAuthStore } from "@/stores/auth-store";

interface PinAddDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pinned: string[];
  onAdd: (href: string) => void;
}

/** 핀 추가 - 메뉴 트리에서 검색하여 추가 */
export function PinAddDialog({ open, onOpenChange, pinned, onAdd }: PinAddDialogProps) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.isSuperAdmin === true;
  const [query, setQuery] = useState("");

  const allItems = useMemo(() => {
    const filteredNav = getFilteredNavigation(user?.menuPermissions, isSuperAdmin);
    return flattenNavigation(filteredNav);
  }, [user?.menuPermissions, isSuperAdmin]);

  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.parentName?.toLowerCase().includes(q) ||
        i.href.toLowerCase().includes(q),
    );
  }, [allItems, query]);

  const handleSelect = (item: FlatMenuEntry) => {
    if (pinnedSet.has(item.href)) return;
    onAdd(item.href);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-[18px] font-bold text-black">핀 메뉴 추가</DialogTitle>
          <DialogDescription className="text-[14px] text-black font-normal">
            자주 쓰는 메뉴를 골라 핀 바에 고정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              autoFocus
              placeholder="메뉴 이름 또는 경로 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-2 pb-3">
          {results.length === 0 ? (
            <div className="text-center py-8 text-[14px] text-slate-500">
              검색 결과가 없습니다
            </div>
          ) : (
            <ul className="flex flex-col">
              {results.map((item) => {
                const Icon = item.icon;
                const isPinned = pinnedSet.has(item.href);
                return (
                  <li key={item.href}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      disabled={isPinned}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-sm px-3 py-2 text-[14px] font-normal text-black text-left",
                        isPinned ? "opacity-50 cursor-default" : "hover:bg-slate-100",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="flex-1 min-w-0 truncate">
                        {item.parentName && (
                          <span className="text-slate-400">{item.parentName} › </span>
                        )}
                        {item.name}
                      </span>
                      {isPinned && (
                        <span className="flex items-center gap-1 text-[12px] text-indigo-600 shrink-0">
                          <Pin className="h-3 w-3 fill-indigo-600" />
                          고정됨
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

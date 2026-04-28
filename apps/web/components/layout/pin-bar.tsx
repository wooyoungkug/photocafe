"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { Plus, X, Pin } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { findMenuByHref, canAccessHref } from "@/lib/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useUserPreferences, useUpdatePreferences } from "@/hooks/use-user-preferences";
import { PinAddDialog } from "./pin-add-dialog";

/**
 * 36px 핀(즐겨찾기) 바.
 * - 사용자가 [+ 핀 추가] 버튼으로 메뉴를 골라 등록
 * - hover 시 [×] 표시 → 클릭으로 제거
 * - 좌우 드래그로 순서 변경 (@dnd-kit/sortable)
 * - 권한 없는 핀은 자동 숨김
 * - 비어있을 땐 안내 문구 + 추가 버튼만
 */
export function PinBar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.isSuperAdmin === true || user?.role === "admin";
  const { data: prefs } = useUserPreferences();
  const update = useUpdatePreferences();

  const [dialogOpen, setDialogOpen] = useState(false);

  const pinned = prefs?.pinnedMenus ?? [];

  const visiblePins = useMemo(
    () =>
      pinned
        .map((href) => {
          if (!canAccessHref(href, user?.menuPermissions, isSuperAdmin)) return null;
          const meta = findMenuByHref(href);
          if (!meta) return null;
          return meta;
        })
        .filter((v): v is NonNullable<typeof v> => v !== null),
    [pinned, user?.menuPermissions, isSuperAdmin],
  );

  // 드래그가 클릭(네비게이션)을 방해하지 않도록 6px 이동 후 활성화
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAdd = (href: string) => {
    if (pinned.includes(href)) return;
    update.mutate({ pinnedMenus: [...pinned, href] });
    setDialogOpen(false);
  };

  const handleRemove = (href: string) => {
    update.mutate({ pinnedMenus: pinned.filter((h) => h !== href) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // visiblePins 기준의 인덱스를 pinned(전체) 인덱스로 매핑하여 재정렬
    // (권한 필터링으로 숨겨진 핀의 순서는 보존)
    const visibleHrefs = visiblePins.map((p) => p.href);
    const fromIdx = visibleHrefs.indexOf(String(active.id));
    const toIdx = visibleHrefs.indexOf(String(over.id));
    if (fromIdx === -1 || toIdx === -1) return;

    const newVisibleOrder = arrayMove(visibleHrefs, fromIdx, toIdx);

    // 전체 pinned 배열에서 visible 항목들만 새 순서로 교체
    const visibleSet = new Set(visibleHrefs);
    let cursor = 0;
    const next = pinned.map((href) =>
      visibleSet.has(href) ? newVisibleOrder[cursor++] : href,
    );

    update.mutate({ pinnedMenus: next });
  };

  return (
    <div className="h-9 flex items-center gap-1 px-3 bg-slate-50 border-b border-slate-200 overflow-x-auto">
      <Pin className="h-3.5 w-3.5 text-slate-400 shrink-0" />

      {visiblePins.length === 0 ? (
        <span className="fs-pin font-normal text-slate-400 ml-1 shrink-0">
          자주 쓰는 메뉴를 핀으로 고정해보세요
        </span>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visiblePins.map((p) => p.href)} strategy={horizontalListSortingStrategy}>
            <ul className="flex items-center gap-1 shrink-0">
              {visiblePins.map((p) => {
                const active = pathname === p.href || pathname.startsWith(p.href + "/");
                return (
                  <SortablePin
                    key={p.href}
                    href={p.href}
                    name={p.name}
                    parentName={p.parentName}
                    active={active}
                    onRemove={() => handleRemove(p.href)}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="ml-auto inline-flex items-center gap-1 rounded-md px-2 h-7 fs-pin font-normal text-slate-600 hover:bg-white hover:text-indigo-700 hover:shadow-sm transition-colors shrink-0"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>핀 추가</span>
      </button>

      <PinAddDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pinned={pinned}
        onAdd={handleAdd}
      />
    </div>
  );
}

interface SortablePinProps {
  href: string;
  name: string;
  parentName?: string;
  active: boolean;
  onRemove: () => void;
}

function SortablePin({ href, name, parentName, active, onRemove }: SortablePinProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: href,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group relative shrink-0"
      {...attributes}
      {...listeners}
    >
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 h-7 fs-pin font-normal transition-colors whitespace-nowrap select-none cursor-grab active:cursor-grabbing",
          active
            ? "bg-indigo-100 text-indigo-700"
            : "text-black hover:bg-white hover:shadow-sm",
        )}
        title={parentName ? `${parentName} › ${name}` : name}
        draggable={false}
      >
        <span>{name}</span>
      </Link>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          "absolute -top-1 -right-1 rounded-full bg-slate-700 text-white p-0.5",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:bg-red-600",
        )}
        aria-label={`${name} 핀 제거`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </li>
  );
}

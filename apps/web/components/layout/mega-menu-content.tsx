"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { type NavItem, groupChildrenByGroup, shouldUseMegaMenu } from "@/lib/navigation";

interface MegaMenuContentProps {
  item: NavItem;
  onNavigate?: () => void;
}

/**
 * 대메뉴 hover 시 펼쳐지는 패널.
 * - 서브 6개 이상: 컬럼별 그룹핑 (메가메뉴)
 * - 5개 이하: 단일 컬럼 드롭다운
 */
export function MegaMenuContent({ item, onNavigate }: MegaMenuContentProps) {
  const pathname = usePathname();
  if (!item.children || item.children.length === 0) return null;

  const useMega = shouldUseMegaMenu(item);

  if (useMega) {
    const groups = groupChildrenByGroup(item.children);
    return (
      <div
        className={cn(
          "min-w-[560px] max-w-[820px] rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/[0.02]",
          "p-5",
          "grid gap-5",
          groups.length === 1 ? "grid-cols-1" : groups.length === 2 ? "grid-cols-2" : "grid-cols-3",
        )}
      >
        {groups.map(([groupName, children]) => (
          <div key={groupName} className="flex flex-col">
            <div className="mb-2 px-2 pb-1.5 fs-menu-mega-header font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              {groupName}
            </div>
            <ul className="flex flex-col">
              {children.map((child) => {
                const active = pathname === child.href || pathname.startsWith(child.href + "/");
                return (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-md px-2 py-1.5 fs-menu-sub font-normal transition-colors",
                        active
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                      )}
                    >
                      {child.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  // 5개 이하: 단일 컬럼
  return (
    <div className="min-w-[220px] rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/[0.02] p-2">
      <ul className="flex flex-col">
        {item.children.map((child) => {
          const active = pathname === child.href || pathname.startsWith(child.href + "/");
          return (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "block rounded-md px-3 py-2 fs-menu-sub font-normal transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                {child.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

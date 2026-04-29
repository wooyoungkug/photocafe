"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUnreadCount } from "@/hooks/use-notifications";
import { NotificationDropdown } from "./notification-dropdown";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;
  const hasUnread = count > 0;
  const display = count > 99 ? "99+" : String(count);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            className ??
            "relative p-2 rounded-lg hover:bg-slate-100/80 active:bg-slate-200/60 transition-all duration-150 group"
          }
          aria-label="알림"
        >
          <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors duration-150" />
          {hasUnread && (
            <span
              className="absolute -top-1 -right-1 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white"
              aria-live="polite"
              aria-label={`미확인 알림 ${count}건`}
            >
              {display}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto p-0"
      >
        <NotificationDropdown onItemClick={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

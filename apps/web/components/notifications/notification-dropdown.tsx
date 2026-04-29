"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ArrowRight,
  Bell,
  Edit,
  Loader2,
  Printer,
  UserPlus,
} from "lucide-react";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  type Notification,
  type NotificationType,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

interface NotificationDropdownProps {
  onItemClick?: () => void;
}

function getIconForType(type: NotificationType) {
  switch (type) {
    case "order_edit":
      return Edit;
    case "reprint_request":
      return Printer;
    case "print_operator_assigned":
      return UserPlus;
    case "order_status_changed":
      return ArrowRight;
    default:
      return Bell;
  }
}

export function NotificationDropdown({ onItemClick }: NotificationDropdownProps) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications({ limit: 20 });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items: Notification[] = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  const handleItemClick = (n: Notification) => {
    if (!n.readAt) {
      markRead.mutate(n.id);
    }
    if (n.link) {
      router.push(n.link);
    }
    onItemClick?.();
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <div className="flex w-[360px] flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-[18px] font-bold text-black">{t("title")}</h3>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={markAllRead.isPending || items.every((i) => i.readAt)}
          className="text-[14px] font-normal text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          {markAllRead.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("markAllRead")
          )}
        </button>
      </div>

      {/* 본문 */}
      <div className="max-h-[480px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-[14px] font-normal text-black">{t("empty")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
              const Icon = getIconForType(n.type);
              const isUnread = !n.readAt;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                      isUnread && "bg-blue-50 hover:bg-blue-100/70"
                    )}
                  >
                    {/* 미확인 점 */}
                    <span className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </span>
                    {/* 아이콘 */}
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    {/* 내용 */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[14px] text-black",
                          isUnread ? "font-bold" : "font-normal"
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-[14px] font-normal text-black/70">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[12px] font-normal text-slate-400">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* 더 보기 */}
        {hasNextPage && (
          <div className="border-t border-slate-100 p-2">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex w-full items-center justify-center gap-1 rounded-md py-2 text-[14px] font-normal text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              {isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("loadMore")
              )}
            </button>
          </div>
        )}

        {/* 백그라운드 리프레시 인디케이터 */}
        {isFetching && !isLoading && !isFetchingNextPage && items.length > 0 && (
          <div className="flex items-center justify-center py-1">
            <Loader2 className="h-3 w-3 animate-spin text-slate-300" />
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="border-t border-slate-200 px-4 py-2">
        <button
          type="button"
          onClick={() => {
            router.push("/notifications");
            onItemClick?.();
          }}
          className="block w-full rounded-md py-2 text-center text-[14px] font-normal text-indigo-600 hover:bg-indigo-50"
        >
          {t("viewAll")}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Bell,
  Edit,
  Loader2,
  Printer,
  UserPlus,
  ArrowRight,
  CheckCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  type Notification,
  type NotificationType,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

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

function getLabelForType(type: NotificationType): string {
  switch (type) {
    case "order_edit":
      return "주문 수정";
    case "reprint_request":
      return "재출력 요청";
    case "print_operator_assigned":
      return "출력 담당 지정";
    case "order_status_changed":
      return "주문 상태 변경";
    default:
      return "알림";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications({ unreadOnly, limit: 30 });

  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items: Notification[] = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  const unreadCount = items.filter((n) => !n.readAt).length;

  const handleItemClick = (n: Notification) => {
    if (!n.readAt) {
      markRead.mutate(n.id);
    }
    if (n.link) {
      router.push(n.link);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="알림"
        description="모든 알림을 확인하고 관리하세요."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "알림" }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || unreadCount === 0}
          >
            {markAllRead.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            모두 읽음
          </Button>
        }
      />

      {/* 필터 탭 */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        <button
          type="button"
          onClick={() => setUnreadOnly(false)}
          className={cn(
            "pb-3 px-1 text-[14px] font-normal border-b-2 transition-colors",
            !unreadOnly
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-black hover:text-slate-700"
          )}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => setUnreadOnly(true)}
          className={cn(
            "flex items-center gap-1.5 pb-3 px-1 text-[14px] font-normal border-b-2 transition-colors",
            unreadOnly
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-black hover:text-slate-700"
          )}
        >
          안 읽음
          {!unreadOnly && unreadCount > 0 && (
            <Badge className="h-5 min-w-[20px] rounded-full bg-rose-500 px-1 text-[11px] text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </button>
      </div>

      {/* 알림 목록 */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="mb-3 h-12 w-12 text-slate-200" />
            <p className="text-[18px] font-bold text-black">새 알림이 없습니다</p>
            <p className="mt-1 text-[14px] font-normal text-black/60">
              {unreadOnly ? "읽지 않은 알림이 없습니다." : "아직 받은 알림이 없습니다."}
            </p>
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
                      "flex w-full items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-50",
                      isUnread && "bg-blue-50 hover:bg-blue-100/60"
                    )}
                  >
                    {/* 미확인 점 */}
                    <span className="mt-2 flex h-2 w-2 shrink-0 items-center justify-center">
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </span>

                    {/* 아이콘 */}
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <Icon className="h-5 w-5" />
                    </span>

                    {/* 내용 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "text-[14px] text-black",
                            isUnread ? "font-bold" : "font-normal"
                          )}
                        >
                          {n.title}
                        </p>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-normal text-slate-500">
                          {getLabelForType(n.type)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="mt-0.5 text-[14px] font-normal text-black/60">
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

                    {/* 읽음 상태 */}
                    {!isUnread && (
                      <span className="mt-1 shrink-0 text-[12px] font-normal text-slate-300">
                        읽음
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* 더 보기 */}
        {hasNextPage && (
          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-[14px] font-normal text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              {isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "더 보기"
              )}
            </button>
          </div>
        )}

        {/* 백그라운드 리프레시 인디케이터 */}
        {isFetching && !isLoading && !isFetchingNextPage && items.length > 0 && (
          <div className="flex items-center justify-center border-t border-slate-100 py-2">
            <Loader2 className="h-3 w-3 animate-spin text-slate-300" />
          </div>
        )}
      </div>
    </div>
  );
}

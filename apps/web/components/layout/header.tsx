"use client";

import { Bell, Search, User, LogOut, ChevronDown } from "lucide-react";
import { useLogout, useCurrentUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user } = useCurrentUser();
  const logout = useLogout();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 shadow-sm">
      {/* 검색 영역 */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            className="h-10 w-72 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:w-80"
          />
        </div>
      </div>

      {/* 우측 메뉴 영역 */}
      <div className="flex items-center gap-4">
        {/* 알림 버튼 */}
        <button className="relative rounded-xl p-2.5 hover:bg-slate-100 transition-colors group">
          <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
          <span className="absolute right-1 top-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        </button>

        {/* 구분선 */}
        <div className="h-8 w-px bg-slate-200"></div>

        {/* 사용자 정보 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800">{user?.name || '사용자'}</span>
              <span className="text-xs text-slate-500">{user?.role === 'ADMIN' ? '관리자' : '사용자'}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>

          {/* 로그아웃 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            로그아웃
          </Button>
        </div>
      </div>
    </header>
  );
}


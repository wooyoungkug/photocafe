"use client";

import { Bell, Search, User, LogOut } from "lucide-react";
import { useLogout, useCurrentUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user } = useCurrentUser();
  const logout = useLogout();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="검색..."
            className="h-10 w-64 rounded-lg border pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 hover:bg-gray-100">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
              <User className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">{user?.name || '사용자'}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-gray-600 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4 mr-1" />
            로그아웃
          </Button>
        </div>
      </div>
    </header>
  );
}

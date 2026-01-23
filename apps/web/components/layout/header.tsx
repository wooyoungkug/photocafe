"use client";

import { useState } from "react";
import { Bell, Search, User, LogOut, ChevronDown, Key, Menu } from "lucide-react";
import { useLogout, useCurrentUser, useChangePassword } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, showMenuButton }: HeaderProps) {
  const { user } = useCurrentUser();
  const logout = useLogout();
  const changePassword = useChangePassword();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("비밀번호는 최소 6자 이상이어야 합니다");
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("비밀번호가 변경되었습니다");
      setIsPasswordDialogOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "비밀번호 변경에 실패했습니다");
    }
  };

  return (
    <>
      <header className="flex h-14 sm:h-16 items-center justify-between border-b bg-white/80 backdrop-blur-md px-3 sm:px-4 lg:px-6 shadow-sm">
        {/* 좌측 영역 */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* 모바일 메뉴 버튼 */}
          {showMenuButton && (
            <button
              type="button"
              onClick={onMenuClick}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors lg:hidden"
              title="메뉴 열기"
              aria-label="메뉴 열기"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}

          {/* 검색 영역 - 태블릿 이상에서만 표시 */}
          <div className="relative group hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
            <input
              type="text"
              placeholder="검색어를 입력하세요..."
              className="h-10 w-48 lg:w-72 border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 lg:focus:w-80"
            />
          </div>

          {/* 모바일 검색 버튼 */}
          <button
            type="button"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors md:hidden"
            title="검색"
            aria-label="검색"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* 우측 메뉴 영역 */}
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
          {/* 프론트엔드 바로가기 - 데스크톱에서만 표시 */}
          <a
            href="http://localhost:3002"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            Frontend
          </a>

          {/* 알림 버튼 */}
          <button
            type="button"
            className="relative p-2 sm:p-2.5 hover:bg-slate-100 transition-colors group"
            title="알림"
            aria-label="알림"
          >
            <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
            <span className="absolute right-1 top-1 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-500"></span>
            </span>
          </button>

          {/* 구분선 - 태블릿 이상에서만 표시 */}
          <div className="hidden sm:block h-8 w-px bg-slate-200"></div>

          {/* 사용자 정보 드롭다운 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-slate-50 px-2 sm:px-3 py-2 transition-colors">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
                  <User className="h-4 w-4" />
                </div>
                {/* 사용자 이름 - 태블릿 이상에서만 표시 */}
                <div className="hidden sm:flex flex-col">
                  <span className="text-sm font-semibold text-slate-800">{user?.name || '사용자'}</span>
                  <span className="text-xs text-slate-500">{user?.role === 'ADMIN' ? '관리자' : '사용자'}</span>
                </div>
                <ChevronDown className="hidden sm:block h-4 w-4 text-slate-400" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* 모바일에서 사용자 정보 표시 */}
              <div className="sm:hidden px-2 py-2 border-b">
                <p className="text-sm font-semibold text-slate-800">{user?.name || '사용자'}</p>
                <p className="text-xs text-slate-500">{user?.role === 'ADMIN' ? '관리자' : '사용자'}</p>
              </div>
              <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)}>
                <Key className="h-4 w-4 mr-2" />
                비밀번호 변경
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 비밀번호 변경 다이얼로그 */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
            <DialogDescription>
              현재 비밀번호를 확인하고 새 비밀번호를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                placeholder="현재 비밀번호 입력"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                placeholder="새 비밀번호 입력 (최소 6자)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                placeholder="새 비밀번호 다시 입력"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsPasswordDialogOpen(false);
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
              }}
              className="w-full sm:w-auto"
            >
              취소
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changePassword.isPending}
              className="w-full sm:w-auto"
            >
              {changePassword.isPending ? "변경 중..." : "변경하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

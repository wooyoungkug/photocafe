"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  User,
  LogOut,
  ChevronDown,
  Key,
  Menu,
  ExternalLink,
  Store,
  X,
  ArrowLeftRight,
  PanelTop,
  PanelLeft,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useLogout, useCurrentUser, useChangePassword, useIsImpersonating, useEndImpersonation } from "@/hooks/use-auth";
import { useUserPreferences, useUpdatePreferences } from "@/hooks/use-user-preferences";
import { TopNav } from "./top-nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  layoutMode?: "top" | "side";
}

export function Header({ onMenuClick, showMenuButton, layoutMode = "side" }: HeaderProps) {
  const { user } = useCurrentUser();
  const logout = useLogout();
  const isImpersonating = useIsImpersonating();
  const endImpersonation = useEndImpersonation();
  const changePassword = useChangePassword();
  const { data: prefs } = useUserPreferences();
  const updatePrefs = useUpdatePreferences();
  const isTopMode = layoutMode === "top";
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus search
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      if (isTopMode) {
        setIsMobileSearchOpen(true);
      } else {
        searchInputRef.current?.focus();
      }
    }
    if (e.key === "Escape" && isSearchFocused) {
      searchInputRef.current?.blur();
      setIsSearchFocused(false);
    }
  }, [isSearchFocused, isTopMode]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "비밀번호 변경에 실패했습니다";
      toast.error(message);
    }
  };

  // Detect OS for keyboard shortcut display
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const shortcutLabel = isMac ? "\u2318K" : "Ctrl K";

  return (
    <TooltipProvider delayDuration={300}>
      <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-slate-200/70 bg-white/80 backdrop-blur-xl px-3 sm:px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Mobile menu button */}
          {showMenuButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onMenuClick}
                  className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 active:bg-slate-200/60 transition-all duration-150 lg:hidden"
                  aria-label="메뉴 열기"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">메뉴 열기</TooltipContent>
            </Tooltip>
          )}

          {/* Top mode: Logo + TopNav (desktop only) */}
          {isTopMode && (
            <>
              <Link href="/dashboard" className="hidden lg:flex shrink-0 items-center gap-2">
                <Image
                  src="/images/photocafe_logo_v2.png"
                  alt="Photocafe"
                  width={182}
                  height={47}
                  priority
                  className="h-[42px] w-auto"
                />
              </Link>
              <div className="hidden lg:flex flex-1 min-w-0 ml-2">
                <TopNav />
              </div>
            </>
          )}

          {/* Search bar - tablet and above (top 모드에선 숨김) */}
          <div className={isTopMode ? "hidden" : "relative group hidden md:block"}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-indigo-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="검색어를 입력하세요..."
              className="h-9 w-52 lg:w-64 rounded-lg border border-slate-200/80 bg-slate-50/80 pl-9 pr-20 text-sm text-slate-700 placeholder:text-slate-400 transition-all duration-300 ease-out focus:w-72 lg:focus:w-80 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:shadow-sm"
              aria-label="검색"
            />
            {/* Keyboard shortcut badge */}
            {!isSearchFocused && !searchQuery && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                <kbd className="hidden lg:inline-flex h-5 items-center gap-0.5 rounded border border-slate-200 bg-slate-100/80 px-1.5 font-mono text-[10px] font-medium text-slate-400 select-none">
                  {shortcutLabel}
                </kbd>
              </div>
            )}
            {/* Clear button when search has content */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="검색어 지우기"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Mobile search button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen((prev) => !prev)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/60 transition-all duration-150 md:hidden"
                aria-label="검색"
              >
                {isMobileSearchOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">검색</TooltipContent>
          </Tooltip>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
          {/* Shop link button - desktop only */}
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-100/80 transition-all duration-150 hover:shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>쇼핑몰</span>
              </a>
            </TooltipTrigger>
            <TooltipContent side="bottom">새 탭에서 쇼핑몰 열기</TooltipContent>
          </Tooltip>

          {/* Layout toggle (desktop only) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  const next: "top" | "side" = isTopMode ? "side" : "top";
                  updatePrefs.mutate({ layoutMode: next });
                }}
                className="hidden lg:inline-flex p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/60 transition-all duration-150"
                aria-label="레이아웃 전환"
              >
                {isTopMode ? <PanelLeft className="h-5 w-5" /> : <PanelTop className="h-5 w-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isTopMode ? "좌측 사이드바로 전환" : "상단 메뉴바로 전환"}
            </TooltipContent>
          </Tooltip>

          {/* Top mode: search button (opens slide-down search panel) */}
          {isTopMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen((prev) => !prev)}
                  className="hidden lg:inline-flex p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all"
                  aria-label="검색"
                >
                  <Search className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">검색 (Ctrl+K)</TooltipContent>
            </Tooltip>
          )}

          {/* Notification bell with unread badge + popover dropdown */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <NotificationBell />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">알림</TooltipContent>
          </Tooltip>

          {/* Divider - tablet and above */}
          <div className="hidden sm:block h-6 w-px bg-slate-200/80 mx-1" />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 sm:gap-2.5 cursor-pointer rounded-lg hover:bg-slate-50/80 px-1.5 sm:px-2.5 py-1.5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                aria-label="사용자 메뉴"
              >
                {/* Avatar with gradient */}
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20 ring-2 ring-white">
                  <User className="h-4 w-4" />
                </div>
                {/* User info - tablet and above */}
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-semibold text-slate-800 leading-tight">
                    {user?.type === 'employee'
                      ? user?.isOwner
                        ? `${user?.name || '사용자'}(최고관리자)`
                        : `${user?.name || '사용자'} (${user?.employeeRole === 'MANAGER' ? 'Manager' : user?.employeeRole === 'EDITOR' ? 'Editor' : 'Staff'})`
                      : `${user?.name || '사용자'}(${user?.isSuperAdmin ? '최고관리자' : '관리자'})`}
                  </span>
                  <span className="text-[11px] text-slate-400 leading-tight">
                    {user?.type === 'employee' ? user?.clientName : (user?.role === "ADMIN" ? "관리자" : "사용자")}
                  </span>
                </div>
                <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1">
              {/* Mobile user info */}
              <div className="sm:hidden px-2 py-2.5">
                <p className="text-sm font-semibold text-slate-800">
                  {user?.type === 'employee'
                    ? user?.isOwner
                      ? `${user?.name || '사용자'}(최고관리자)`
                      : `${user?.name || '사용자'} (${user?.employeeRole === 'MANAGER' ? 'Manager' : user?.employeeRole === 'EDITOR' ? 'Editor' : 'Staff'})`
                    : `${user?.name || '사용자'}(${user?.isSuperAdmin ? '최고관리자' : '관리자'})`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {user?.type === 'employee' && !user?.isOwner ? user?.clientName : (user?.email || "")}
                </p>
              </div>
              <DropdownMenuSeparator className="sm:hidden" />

              {/* Desktop user info label */}
              <DropdownMenuLabel className="hidden sm:block font-normal">
                <p className="text-sm font-medium text-slate-700">
                  {user?.type === 'employee'
                    ? user?.isOwner
                      ? `${user?.name || '사용자'}(최고관리자)`
                      : `${user?.name || '사용자'} (${user?.employeeRole === 'MANAGER' ? 'Manager' : user?.employeeRole === 'EDITOR' ? 'Editor' : 'Staff'})`
                    : `${user?.name || '사용자'}(${user?.isSuperAdmin ? '최고관리자' : '관리자'})`}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {user?.type === 'employee' && !user?.isOwner ? `${user?.clientName} · ${user?.email}` : (user?.email || "")}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="hidden sm:block" />

              {/* Shop link in dropdown */}
              <DropdownMenuItem asChild className="lg:hidden">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Store className="h-4 w-4 text-slate-500" />
                  <span>쇼핑몰 바로가기</span>
                  <ExternalLink className="h-3 w-3 ml-auto text-slate-400" />
                </a>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsPasswordDialogOpen(true)}
                className="gap-2 cursor-pointer"
              >
                <Key className="h-4 w-4 text-slate-500" />
                비밀번호 변경
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {isImpersonating && (
                <DropdownMenuItem
                  onClick={endImpersonation}
                  className="gap-2 cursor-pointer text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  대리로그인 종료
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={logout}
                className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile/top-mode search bar - slides down below header */}
      {isMobileSearchOpen && (
        <div className={`${isTopMode ? "" : "md:hidden"} border-b border-slate-200/80 bg-white px-3 py-2 animate-in slide-in-from-top-2 duration-200`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어를 입력하세요..."
              className="h-9 w-full rounded-lg border border-slate-200/80 bg-slate-50/80 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              aria-label="검색"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="검색어 지우기"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Password change dialog */}
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
    </TooltipProvider>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useChatMessages, useSendChatMessage, markChatRead } from '@/hooks/use-recruitment-chat';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface BidChatPanelProps {
  open: boolean;
  onClose: () => void;
  bidId: string;
  bidderName: string;
  myClientId: string;
}

export function BidChatPanel({
  open,
  onClose,
  bidId,
  bidderName,
  myClientId,
}: BidChatPanelProps) {
  const { toast } = useToast();
  // open 상태일 때만 폴링이 의미가 있도록 bidId를 null/value로 toggle
  const activeBidId = open && bidId ? bidId : null;
  const { data: messages, isLoading } = useChatMessages(activeBidId);
  const sendMutation = useSendChatMessage(activeBidId);

  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  // 새 메시지 도착 시 자동 하단 스크롤 + 읽음 처리
  useEffect(() => {
    if (!messages || !open) return;
    if (messages.length === lastCountRef.current) return;
    lastCountRef.current = messages.length;
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
    // 패널 열려 있을 때 → 읽음 처리
    if (activeBidId) markChatRead(activeBidId, messages);
  }, [messages, open, activeBidId]);

  // 패널 열릴 때 입력 초기화
  useEffect(() => {
    if (open) {
      setContent('');
      lastCountRef.current = 0;
    }
  }, [open]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (sendMutation.isPending) return;
    try {
      await sendMutation.mutateAsync(trimmed);
      setContent('');
    } catch (error: any) {
      toast({
        title: '메시지 전송 실패',
        description: error?.message || '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex flex-col p-0 w-full sm:max-w-md"
      >
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-[15px]">
            <MessageSquare className="h-4 w-4 text-gray-500" />
            <span className="truncate">{bidderName}님과의 채팅</span>
          </SheetTitle>
        </SheetHeader>

        {/* 메시지 영역 */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50"
        >
          {isLoading && !messages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-10 w-10 text-gray-200 mb-2" />
              <p className="text-[13px] text-gray-400">
                아직 메시지가 없습니다
              </p>
              <p className="text-[12px] text-gray-300 mt-1">
                첫 메시지를 보내보세요
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => {
                const mine = msg.senderId === myClientId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col',
                      mine ? 'items-end' : 'items-start',
                    )}
                  >
                    {!mine && (
                      <p className="text-[11px] text-gray-500 mb-0.5 ml-1">
                        {msg.senderName}
                      </p>
                    )}
                    <div
                      className={cn(
                        'max-w-[78%] px-3 py-2 rounded-2xl text-[14px] whitespace-pre-wrap break-words',
                        mine
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-black rounded-bl-sm',
                      )}
                    >
                      {msg.content}
                    </div>
                    <p
                      className={cn(
                        'text-[10px] text-gray-400 mt-0.5',
                        mine ? 'mr-1' : 'ml-1',
                      )}
                    >
                      {format(new Date(msg.createdAt), 'HH:mm')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div className="border-t bg-white px-3 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요"
              maxLength={1000}
              disabled={sendMutation.isPending}
              className="text-[14px]"
            />
            <Button
              type="button"
              onClick={handleSend}
              disabled={sendMutation.isPending || !content.trim()}
              size="sm"
              className="shrink-0"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

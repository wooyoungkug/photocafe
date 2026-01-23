'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConsultationMessages, useCreateMessage, useDeleteMessage } from '@/hooks/use-consultations';
import {
  ConsultationMessage,
  MessageChannel,
  MESSAGE_CHANNEL_CONFIG,
} from '@/lib/types/consultation';
import { toast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send, Trash2 } from 'lucide-react';

interface MessageChatViewProps {
  consultationId: string;
  clientName: string;
}

export function MessageChatView({ consultationId, clientName }: MessageChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel>('kakao');
  const [messageDirection, setMessageDirection] = useState<'inbound' | 'outbound'>('outbound');

  const { data: messagesData, isLoading: isLoadingMessages } = useConsultationMessages(consultationId);
  const createMessage = useCreateMessage();
  const deleteMessage = useDeleteMessage();

  const handleSendMessage = () => {
    if (!newMessage.trim() || !consultationId) return;

    createMessage.mutate(
      {
        consultationId,
        data: {
          direction: messageDirection,
          channel: selectedChannel,
          content: newMessage.trim(),
          senderName: messageDirection === 'outbound' ? '상담사' : clientName,
          senderType: messageDirection === 'outbound' ? 'staff' : 'client',
        },
      },
      {
        onSuccess: () => {
          setNewMessage('');
          toast({ title: '메시지가 기록되었습니다.' });
        },
        onError: () => {
          toast({ title: '메시지 기록에 실패했습니다.', variant: 'destructive' });
        },
      }
    );
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!confirm('이 메시지를 삭제하시겠습니까?')) return;

    deleteMessage.mutate(
      { consultationId, messageId },
      {
        onSuccess: () => {
          toast({ title: '메시지가 삭제되었습니다.' });
        },
      }
    );
  };

  const messages = messagesData?.data || [];

  // 날짜별로 메시지 그룹화
  const groupedMessages = messages.reduce((groups: Record<string, ConsultationMessage[]>, message) => {
    const date = format(new Date(message.messageAt), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex flex-col h-[500px]">
      {/* 채팅 메시지 영역 */}
      <div className="flex-1 p-4 bg-gradient-to-b from-slate-50 to-white rounded-t-xl border border-b-0 overflow-y-auto">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">대화 기록이 없습니다</p>
            <p className="text-sm">고객과의 대화 내용을 기록해주세요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                {/* 날짜 구분선 */}
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-muted-foreground bg-white px-2">
                    {format(new Date(date), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* 메시지 목록 */}
                {msgs.map((message) => (
                  <div
                    key={message.id}
                    className={`flex mb-3 ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`group relative max-w-[70%] ${
                        message.direction === 'outbound'
                          ? 'bg-yellow-100 rounded-tl-xl rounded-tr-sm rounded-br-xl rounded-bl-xl'
                          : 'bg-white border rounded-tl-sm rounded-tr-xl rounded-br-xl rounded-bl-xl'
                      } p-3 shadow-sm`}
                    >
                      {/* 채널 뱃지와 발신자 */}
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${MESSAGE_CHANNEL_CONFIG[message.channel as MessageChannel]?.color || ''}`}>
                          {MESSAGE_CHANNEL_CONFIG[message.channel as MessageChannel]?.label || message.channel}
                        </Badge>
                        <span className="text-xs font-medium text-slate-600">{message.senderName}</span>
                      </div>

                      {/* 메시지 내용 */}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                      {/* 시간 */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(message.messageAt), 'HH:mm')}
                        </span>

                        {/* 삭제 버튼 */}
                        <button
                          type="button"
                          title="메시지 삭제"
                          onClick={() => handleDeleteMessage(message.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 메시지 입력 영역 */}
      <div className="p-4 border rounded-b-xl bg-white space-y-3">
        {/* 옵션 선택 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">채널:</Label>
            <Select
              value={selectedChannel}
              onValueChange={(v) => setSelectedChannel(v as MessageChannel)}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kakao">카카오톡</SelectItem>
                <SelectItem value="phone">전화</SelectItem>
                <SelectItem value="email">이메일</SelectItem>
                <SelectItem value="system">시스템</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">방향:</Label>
            <Select
              value={messageDirection}
              onValueChange={(v) => setMessageDirection(v as 'inbound' | 'outbound')}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outbound">상담사 → 고객</SelectItem>
                <SelectItem value="inbound">고객 → 상담사</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 입력창 */}
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="대화 내용을 입력하세요..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || createMessage.isPending}
            className="h-auto px-4 bg-yellow-500 hover:bg-yellow-600"
          >
            {createMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          * 카카오톡/전화/이메일 등으로 주고받은 대화 내용을 기록합니다. (Shift+Enter로 줄바꿈)
        </p>
      </div>
    </div>
  );
}

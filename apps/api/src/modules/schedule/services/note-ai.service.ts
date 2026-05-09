import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { NoteAiAction, NoteAiAssistDto } from '../dto/note-ai.dto';

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  clientId?: string;
}

interface UsageEntry {
  date: string; // YYYY-MM-DD (KST)
  count: number;
}

const SUMMARIZE_SYSTEM = `당신은 한국어 메모 요약 도우미입니다.
- 입력 본문을 핵심만 1~3문장으로 요약합니다.
- 누락하면 안 되는 숫자·날짜·고유명사는 보존합니다.
- 메모 작성자의 어조나 결정사항이 있다면 우선 반영합니다.
- 결과는 평문으로만 출력합니다 (마크다운/HTML 금지).
- 입력이 너무 짧거나 의미가 없으면 그대로 반환합니다.`;

const PROOFREAD_SYSTEM = `당신은 한국어 교정·문장 다듬기 도우미입니다.
- 맞춤법과 띄어쓰기 오류를 수정합니다.
- 어색한 문장을 자연스럽게 다듬되, 의미와 정보는 절대 바꾸지 않습니다.
- 작성자의 어조(존대/평어/격식)는 그대로 유지합니다.
- 새로운 정보를 추가하지 않고, 원문에 없는 의견을 넣지 않습니다.
- HTML 태그가 입력에 있으면 태그 구조는 그대로 두고 텍스트만 다듬습니다.
- 결과는 다듬어진 본문 전체만 출력합니다 (설명·머리말·인사말 금지).`;

const SUGGEST_TITLE_SYSTEM = `당신은 한국어 메모 제목 추천 도우미입니다.
- 입력 본문을 읽고 어울리는 짧은 제목 3개를 제안합니다.
- 각 제목은 25자 이내, 명사형 또는 짧은 문장으로 작성합니다.
- 마침표, 따옴표, 마크다운 표시는 사용하지 않습니다.
- 출력은 다음 JSON 형식만 사용합니다:
{"titles":["제목1","제목2","제목3"]}
- JSON 외의 어떤 텍스트도 출력하지 않습니다.`;

const TO_BULLETS_SYSTEM = `당신은 한국어 글머리 기호 변환 도우미입니다.
- 입력 본문을 의미 단위로 끊어 글머리 기호 리스트로 정리합니다.
- 각 항목은 한 줄, 30자 내외, 명확하고 간결하게 작성합니다.
- 중복·중언부언은 1개로 합칩니다.
- 결과는 마크다운 글머리 기호(- )로만 출력합니다.
- 머리말이나 설명을 붙이지 않고 항목만 출력합니다.`;

const SYSTEM_BY_ACTION: Record<NoteAiAction, string> = {
  summarize: SUMMARIZE_SYSTEM,
  proofread: PROOFREAD_SYSTEM,
  'suggest-title': SUGGEST_TITLE_SYSTEM,
  'to-bullets': TO_BULLETS_SYSTEM,
};

const MAX_OUTPUT_TOKENS_BY_ACTION: Record<NoteAiAction, number> = {
  summarize: 512,
  proofread: 4096,
  'suggest-title': 256,
  'to-bullets': 1024,
};

function htmlToPlain(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|li|h[1-6]|br|tr)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function todayKstString(): string {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

@Injectable()
export class NoteAiService {
  private readonly logger = new Logger(NoteAiService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;
  private readonly inputCharLimit: number;
  private readonly dailyLimit: number;
  private readonly usage = new Map<string, UsageEntry>();

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    this.model = config.get<string>('ANTHROPIC_MODEL') || 'claude-haiku-4-5';
    const tokenMax = parseInt(config.get<string>('NOTE_AI_INPUT_TOKEN_MAX') || '8000', 10);
    // 보수적으로 1토큰 ≈ 2자(한국어 기준) 가정 → 입력 문자 수 한도
    this.inputCharLimit = (Number.isFinite(tokenMax) && tokenMax > 0 ? tokenMax : 8000) * 2;
    const limit = parseInt(config.get<string>('NOTE_AI_DAILY_LIMIT') || '200', 10);
    this.dailyLimit = Number.isFinite(limit) && limit > 0 ? limit : 200;

    if (apiKey && apiKey.trim().length > 10) {
      this.client = new Anthropic({ apiKey: apiKey.trim() });
      this.logger.log(`Note AI: enabled (model=${this.model}, daily limit=${this.dailyLimit})`);
    } else {
      this.client = null;
      this.logger.log('Note AI: disabled (ANTHROPIC_API_KEY 미설정)');
    }
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  async assist(dto: NoteAiAssistDto, user: CurrentUser) {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI 보조 기능이 비활성화되어 있습니다. 관리자에게 ANTHROPIC_API_KEY 등록을 요청하세요.',
      );
    }

    const plain =
      dto.contentFormat === 'html' ? htmlToPlain(dto.content) : dto.content || '';
    if (!plain.trim()) {
      throw new BadRequestException('본문이 비어있습니다.');
    }
    if (plain.length > this.inputCharLimit) {
      throw new BadRequestException(
        `본문이 너무 깁니다. 약 ${Math.round(this.inputCharLimit / 1000)}K자 이하로 줄여주세요.`,
      );
    }

    this.assertWithinDailyLimit(user.id);

    const system = SYSTEM_BY_ACTION[dto.action];
    const maxTokens = MAX_OUTPUT_TOKENS_BY_ACTION[dto.action];
    const userPrompt = this.buildUserPrompt(dto.action, dto.title, plain);

    let raw = '';
    let usage: { input_tokens?: number; output_tokens?: number } = {};
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system: [
          {
            type: 'text',
            text: system,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userPrompt }],
      });
      for (const block of response.content) {
        if (block.type === 'text') raw += block.text;
      }
      usage = response.usage;
    } catch (e: any) {
      this.logger.error(`Anthropic API failed: ${e?.message || e}`);
      if (e instanceof Anthropic.RateLimitError) {
        throw new HttpException(
          'AI 서비스가 일시적으로 한도에 도달했습니다. 잠시 후 다시 시도하세요.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (e instanceof Anthropic.APIError) {
        throw new HttpException(
          `AI 호출 실패: ${e.message}`,
          e.status || HttpStatus.BAD_GATEWAY,
        );
      }
      throw new HttpException('AI 호출 실패', HttpStatus.BAD_GATEWAY);
    }

    this.incrementDaily(user.id);

    const parsed = this.parseOutput(dto.action, raw);

    if (dto.action === 'summarize' && dto.noteId) {
      try {
        await this.prisma.note.updateMany({
          where: { id: dto.noteId, creatorId: user.id },
          data: { summary: typeof parsed === 'string' ? parsed : null },
        });
      } catch (e: any) {
        this.logger.warn(`Failed to cache summary: ${e?.message}`);
      }
    }

    return {
      action: dto.action,
      result: parsed,
      usage: {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
      },
      daily: this.getUsage(user.id),
      dailyLimit: this.dailyLimit,
    };
  }

  private buildUserPrompt(action: NoteAiAction, title: string | undefined, body: string): string {
    switch (action) {
      case 'summarize':
        return `다음 메모를 핵심만 1~3문장으로 요약하세요.\n\n제목: ${title || '(없음)'}\n\n본문:\n${body}`;
      case 'proofread':
        return `다음 본문을 맞춤법과 어색한 문장만 다듬어 주세요. 의미를 바꾸지 마세요.\n\n${body}`;
      case 'suggest-title':
        return `다음 메모 본문을 보고 어울리는 제목 3개를 제안하세요.\n\n현재 제목: ${title || '(없음)'}\n\n본문:\n${body}`;
      case 'to-bullets':
        return `다음 본문을 글머리 기호 리스트로 정리하세요.\n\n${body}`;
    }
  }

  private parseOutput(action: NoteAiAction, raw: string): string | string[] {
    const text = raw.trim();
    if (action === 'suggest-title') {
      // JSON 추출 시도
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const obj = JSON.parse(match[0]);
          if (Array.isArray(obj?.titles)) {
            return obj.titles
              .map((t: unknown) => String(t).trim())
              .filter((s: string) => s.length > 0)
              .slice(0, 5);
          }
        } catch {
          // JSON 파싱 실패 시 줄 단위로 폴백
        }
      }
      // 폴백: 줄 단위 파싱
      return text
        .split(/\r?\n/)
        .map((line) => line.replace(/^[-*\d.\s]+/, '').trim())
        .filter((line) => line.length > 0)
        .slice(0, 5);
    }
    return text;
  }

  private getUsage(userId: string): number {
    const today = todayKstString();
    const entry = this.usage.get(userId);
    if (!entry || entry.date !== today) return 0;
    return entry.count;
  }

  private assertWithinDailyLimit(userId: string) {
    const today = todayKstString();
    const entry = this.usage.get(userId);
    const count = entry && entry.date === today ? entry.count : 0;
    if (count >= this.dailyLimit) {
      throw new HttpException(
        `오늘 AI 호출 한도(${this.dailyLimit}회)를 초과했습니다. 내일 다시 시도하세요.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private incrementDaily(userId: string) {
    const today = todayKstString();
    const entry = this.usage.get(userId);
    if (!entry || entry.date !== today) {
      this.usage.set(userId, { date: today, count: 1 });
    } else {
      entry.count += 1;
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';
import {
  QueryDatabaseDto,
  CreatePageDto,
  UpdatePageDto,
  NotionDatabaseResponseDto,
} from './dto/notion.dto';

@Injectable()
export class NotionService implements OnModuleInit {
  private readonly logger = new Logger(NotionService.name);
  private notion: Client;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const notionToken = this.configService.get<string>('NOTION_API_KEY');
    if (notionToken) {
      this.notion = new Client({ auth: notionToken });
      this.logger.log('Notion client initialized');
    } else {
      this.logger.warn('NOTION_API_KEY not configured');
    }
  }

  private ensureClient(): void {
    if (!this.notion) {
      throw new Error('Notion client not initialized. Set NOTION_API_KEY in .env');
    }
  }

  /**
   * 데이터베이스 조회
   */
  async queryDatabase(dto: QueryDatabaseDto): Promise<NotionDatabaseResponseDto> {
    this.ensureClient();

    const response = await this.notion.databases.query({
      database_id: dto.databaseId,
      filter: dto.filter,
      sorts: dto.sorts,
      page_size: dto.pageSize || 100,
      start_cursor: dto.startCursor,
    });

    return {
      results: response.results,
      hasMore: response.has_more,
      nextCursor: response.next_cursor || undefined,
    };
  }

  /**
   * 데이터베이스 정보 조회
   */
  async getDatabase(databaseId: string) {
    this.ensureClient();
    return this.notion.databases.retrieve({ database_id: databaseId });
  }

  /**
   * 페이지 생성
   */
  async createPage(dto: CreatePageDto) {
    this.ensureClient();

    return this.notion.pages.create({
      parent: { database_id: dto.databaseId },
      properties: dto.properties,
      children: dto.children,
    });
  }

  /**
   * 페이지 조회
   */
  async getPage(pageId: string) {
    this.ensureClient();
    return this.notion.pages.retrieve({ page_id: pageId });
  }

  /**
   * 페이지 업데이트
   */
  async updatePage(dto: UpdatePageDto) {
    this.ensureClient();

    return this.notion.pages.update({
      page_id: dto.pageId,
      properties: dto.properties,
    });
  }

  /**
   * 페이지 삭제 (아카이브)
   */
  async deletePage(pageId: string) {
    this.ensureClient();

    return this.notion.pages.update({
      page_id: pageId,
      archived: true,
    });
  }

  /**
   * 블록 자식 조회
   */
  async getBlockChildren(blockId: string, startCursor?: string) {
    this.ensureClient();

    return this.notion.blocks.children.list({
      block_id: blockId,
      start_cursor: startCursor,
      page_size: 100,
    });
  }

  /**
   * 블록에 자식 추가
   */
  async appendBlockChildren(blockId: string, children: any[]) {
    this.ensureClient();

    return this.notion.blocks.children.append({
      block_id: blockId,
      children,
    });
  }

  /**
   * 사용자 목록 조회
   */
  async listUsers() {
    this.ensureClient();
    return this.notion.users.list({});
  }

  /**
   * 검색
   */
  async search(query: string, filter?: { property: 'object'; value: 'page' | 'database' }) {
    this.ensureClient();

    return this.notion.search({
      query,
      filter,
      page_size: 100,
    });
  }

  // ==================== 헬퍼 함수 ====================

  /**
   * Notion 속성값 추출 헬퍼
   */
  extractPropertyValue(property: any): any {
    if (!property) return null;

    switch (property.type) {
      case 'title':
        return property.title?.map((t: any) => t.plain_text).join('') || '';
      case 'rich_text':
        return property.rich_text?.map((t: any) => t.plain_text).join('') || '';
      case 'number':
        return property.number;
      case 'select':
        return property.select?.name || null;
      case 'multi_select':
        return property.multi_select?.map((s: any) => s.name) || [];
      case 'date':
        return property.date?.start || null;
      case 'checkbox':
        return property.checkbox;
      case 'url':
        return property.url;
      case 'email':
        return property.email;
      case 'phone_number':
        return property.phone_number;
      case 'formula':
        return this.extractPropertyValue(property.formula);
      case 'relation':
        return property.relation?.map((r: any) => r.id) || [];
      case 'rollup':
        return property.rollup?.array?.map((a: any) => this.extractPropertyValue(a)) || [];
      case 'status':
        return property.status?.name || null;
      default:
        return null;
    }
  }

  /**
   * Notion 속성 빌더 헬퍼
   */
  buildProperty(type: string, value: any): any {
    switch (type) {
      case 'title':
        return { title: [{ text: { content: value } }] };
      case 'rich_text':
        return { rich_text: [{ text: { content: value } }] };
      case 'number':
        return { number: value };
      case 'select':
        return { select: { name: value } };
      case 'multi_select':
        return { multi_select: value.map((v: string) => ({ name: v })) };
      case 'date':
        return { date: { start: value } };
      case 'checkbox':
        return { checkbox: value };
      case 'url':
        return { url: value };
      case 'email':
        return { email: value };
      case 'phone_number':
        return { phone_number: value };
      case 'status':
        return { status: { name: value } };
      default:
        return null;
    }
  }
}

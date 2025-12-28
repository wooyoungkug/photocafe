import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotionService } from './notion.service';
import {
  QueryDatabaseDto,
  CreatePageDto,
  UpdatePageDto,
} from './dto/notion.dto';

@ApiTags('Notion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notion')
export class NotionController {
  constructor(private readonly notionService: NotionService) {}

  @Post('databases/query')
  @ApiOperation({ summary: '데이터베이스 조회' })
  async queryDatabase(@Body() dto: QueryDatabaseDto) {
    return this.notionService.queryDatabase(dto);
  }

  @Get('databases/:id')
  @ApiOperation({ summary: '데이터베이스 정보 조회' })
  async getDatabase(@Param('id') id: string) {
    return this.notionService.getDatabase(id);
  }

  @Post('pages')
  @ApiOperation({ summary: '페이지 생성' })
  async createPage(@Body() dto: CreatePageDto) {
    return this.notionService.createPage(dto);
  }

  @Get('pages/:id')
  @ApiOperation({ summary: '페이지 조회' })
  async getPage(@Param('id') id: string) {
    return this.notionService.getPage(id);
  }

  @Put('pages/:id')
  @ApiOperation({ summary: '페이지 업데이트' })
  async updatePage(
    @Param('id') id: string,
    @Body() body: { properties: Record<string, any> },
  ) {
    return this.notionService.updatePage({
      pageId: id,
      properties: body.properties,
    });
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: '페이지 삭제 (아카이브)' })
  async deletePage(@Param('id') id: string) {
    return this.notionService.deletePage(id);
  }

  @Get('blocks/:id/children')
  @ApiOperation({ summary: '블록 자식 조회' })
  @ApiQuery({ name: 'startCursor', required: false })
  async getBlockChildren(
    @Param('id') id: string,
    @Query('startCursor') startCursor?: string,
  ) {
    return this.notionService.getBlockChildren(id, startCursor);
  }

  @Post('blocks/:id/children')
  @ApiOperation({ summary: '블록에 자식 추가' })
  async appendBlockChildren(
    @Param('id') id: string,
    @Body() body: { children: any[] },
  ) {
    return this.notionService.appendBlockChildren(id, body.children);
  }

  @Get('users')
  @ApiOperation({ summary: '사용자 목록 조회' })
  async listUsers() {
    return this.notionService.listUsers();
  }

  @Get('search')
  @ApiOperation({ summary: '검색' })
  @ApiQuery({ name: 'query', required: true })
  @ApiQuery({ name: 'type', required: false, enum: ['page', 'database'] })
  async search(
    @Query('query') query: string,
    @Query('type') type?: 'page' | 'database',
  ) {
    const filter = type ? { property: 'object' as const, value: type } : undefined;
    return this.notionService.search(query, filter);
  }
}

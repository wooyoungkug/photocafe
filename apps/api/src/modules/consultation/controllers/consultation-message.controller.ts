import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConsultationMessageService } from '../services/consultation-message.service';
import {
  CreateMessageDto,
  UpdateMessageDto,
  MessageQueryDto,
  MarkAsReadDto,
} from '../dto';

@ApiTags('Consultation Messages')
@Controller('consultations/:consultationId/messages')
export class ConsultationMessageController {
  constructor(
    private readonly messageService: ConsultationMessageService,
  ) {}

  @Get()
  @ApiOperation({ summary: '상담 메시지 목록 조회' })
  @ApiResponse({ status: 200, description: '메시지 목록' })
  async findMessages(
    @Param('consultationId') consultationId: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.messageService.findMessages(consultationId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '읽지 않은 메시지 수' })
  @ApiResponse({ status: 200, description: '읽지 않은 메시지 수' })
  async getUnreadCount(@Param('consultationId') consultationId: string) {
    const count = await this.messageService.getUnreadCount(consultationId);
    return { count };
  }

  @Get(':messageId')
  @ApiOperation({ summary: '메시지 상세 조회' })
  @ApiResponse({ status: 200, description: '메시지 상세' })
  async findOne(@Param('messageId') messageId: string) {
    return this.messageService.findOne(messageId);
  }

  @Post()
  @ApiOperation({ summary: '메시지 등록' })
  @ApiResponse({ status: 201, description: '메시지 등록 완료' })
  async create(
    @Param('consultationId') consultationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messageService.create(consultationId, dto);
  }

  @Put(':messageId')
  @ApiOperation({ summary: '메시지 수정' })
  @ApiResponse({ status: 200, description: '메시지 수정 완료' })
  async update(
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messageService.update(messageId, dto);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: '메시지 삭제' })
  @ApiResponse({ status: 200, description: '메시지 삭제 완료' })
  async remove(@Param('messageId') messageId: string) {
    return this.messageService.remove(messageId);
  }

  @Patch('read')
  @ApiOperation({ summary: '메시지 읽음 처리' })
  @ApiResponse({ status: 200, description: '읽음 처리 완료' })
  async markAsRead(
    @Param('consultationId') consultationId: string,
    @Body() dto: MarkAsReadDto,
  ) {
    return this.messageService.markAsRead(consultationId, dto);
  }
}

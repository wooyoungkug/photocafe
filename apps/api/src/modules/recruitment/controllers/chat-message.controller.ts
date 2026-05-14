import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatMessageService } from '../services/chat-message.service';
import { CreateChatMessageDto } from '../dto/chat-message.dto';

@ApiTags('구인방 - 채팅')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recruitment/bids/:bidId/messages')
export class ChatMessageController {
  constructor(private readonly chatService: ChatMessageService) {}

  @Get()
  @ApiOperation({ summary: '응찰별 채팅 메시지 목록 조회 (최신 100개)' })
  async getMessages(@Param('bidId') bidId: string, @Request() req: any) {
    return this.chatService.getMessages(bidId, req.user.clientId);
  }

  @Post()
  @ApiOperation({ summary: '응찰별 채팅 메시지 전송' })
  async sendMessage(
    @Param('bidId') bidId: string,
    @Body() dto: CreateChatMessageDto,
    @Request() req: any,
  ) {
    return this.chatService.sendMessage(bidId, req.user.clientId, dto.content);
  }
}

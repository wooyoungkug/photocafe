import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { StaffOnlyGuard } from '@/common/guards/staff-only.guard';
import { AgentTokenService } from '../services/agent-token.service';

@ApiTags('Agent Tokens (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StaffOnlyGuard)
@Controller('agent-tokens')
export class AgentTokenAdminController {
  constructor(private readonly service: AgentTokenService) {}

  @Get()
  @ApiOperation({ summary: '에이전트 토큰 목록 (활성→비활성, 등록일 desc)' })
  list() {
    return this.service.list();
  }

  @Post()
  @ApiOperation({
    summary: '신규 토큰 발급 (평문 토큰은 응답에서 한 번만 노출)',
  })
  async create(@Req() req: any, @Body() body: { name: string }) {
    const staffId = req.user?.id ?? req.user?.staffId ?? null;
    const result = await this.service.createToken({
      name: body.name,
      createdByStaffId: staffId,
    });
    return {
      token: result.token, // 평문 — 1회만 표시
      ...result.record,
      tokenHash: undefined, // 응답에서는 해시 숨김
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '토큰 비활성화 (isActive=false)' })
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}

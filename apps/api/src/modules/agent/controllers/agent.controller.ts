import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AgentService } from '../services/agent.service';
import { AgentTokenService } from '../services/agent-token.service';
import { AgentTokenGuard } from '../guards/agent-token.guard';

@ApiTags('Agent (Hotfolder)')
@ApiSecurity('X-Agent-Token')
@UseGuards(AgentTokenGuard)
@Controller('agent')
export class AgentController {
  constructor(
    private readonly service: AgentService,
    private readonly tokens: AgentTokenService,
  ) {}

  @Get('pending-files')
  @ApiOperation({
    summary: '에이전트가 아직 받지 않은 PrintReadyFile 목록 + 5분 유효 presigned URL',
  })
  async pending(@Req() req: any, @Query('limit') limit?: string) {
    const lim = limit ? Math.min(200, Math.max(1, parseInt(limit, 10))) : 50;
    return this.service.getPendingFiles(req.agentToken.id, lim);
  }

  @Post('mark-downloaded')
  @ApiOperation({
    summary: '에이전트가 핫폴더에 저장 완료 후 호출. PrintDownloadLog 기록',
  })
  async markDownloaded(
    @Req() req: any,
    @Body()
    body: { printReadyFileId: string; localPath: string; fileSize: number },
  ) {
    return this.service.markDownloaded({
      agentId: req.agentToken.id,
      printReadyFileId: body.printReadyFileId,
      localPath: body.localPath,
      fileSize: body.fileSize,
    });
  }

  @Post('heartbeat')
  @ApiOperation({
    summary: '에이전트 heartbeat (30초 권장). lastHeartbeatAt 갱신',
  })
  async heartbeat(@Req() req: any, @Body() body: { machineName?: string }) {
    const ip =
      (req.headers['x-forwarded-for']?.toString().split(',')[0] ||
        req.ip ||
        '') as string;
    return this.tokens.recordHeartbeat(req.agentToken.id, {
      machineName: body?.machineName ?? null,
      ip: ip || null,
    });
  }

  @Get('status')
  @ApiOperation({ summary: '에이전트 자가 확인용. 현재 토큰의 기본 정보 반환' })
  async status(@Req() req: any) {
    return {
      id: req.agentToken.id,
      name: req.agentToken.name,
      machineName: req.agentToken.machineName,
      lastHeartbeatAt: req.agentToken.lastHeartbeatAt,
      isActive: req.agentToken.isActive,
    };
  }
}

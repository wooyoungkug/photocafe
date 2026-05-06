import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { ToolUsageService } from './tool-usage.service';

@ApiTags('tool-usage')
@Controller('tool-usage')
export class ToolUsageController {
    constructor(private readonly toolUsageService: ToolUsageService) {}

    @Public()
    @Get()
    @Throttle({ default: { ttl: 60000, limit: 60 } })
    @ApiOperation({ summary: '여러 도구의 사용 통계 조회' })
    @ApiQuery({ name: 'toolIds', required: true, description: '쉼표로 구분된 도구 ID 목록' })
    getBatchStats(@Query('toolIds') toolIds: string) {
        const ids = toolIds
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id.length > 0);

        return this.toolUsageService.getBatchStats(ids);
    }

    @Public()
    @Patch(':toolId/access')
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @ApiOperation({ summary: '도구 접속 횟수 증가' })
    @ApiParam({ name: 'toolId', description: '도구 ID' })
    incrementAccess(@Param('toolId') toolId: string) {
        return this.toolUsageService.incrementAccess(toolId);
    }

    @Public()
    @Patch(':toolId/use')
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @ApiOperation({ summary: '도구 사용 횟수 증가' })
    @ApiParam({ name: 'toolId', description: '도구 ID' })
    incrementUse(@Param('toolId') toolId: string) {
        return this.toolUsageService.incrementUse(toolId);
    }
}

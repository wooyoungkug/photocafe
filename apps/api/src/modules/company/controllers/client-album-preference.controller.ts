import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientAlbumPreferenceService } from '../services/client-album-preference.service';
import { UpsertClientAlbumPreferenceDto } from '../dto/client-album-preference.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('client-album-preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients/:clientId/album-preference')
export class ClientAlbumPreferenceController {
  constructor(private albumPreferenceService: ClientAlbumPreferenceService) {}

  @Get()
  @ApiOperation({ summary: '거래처 앨범 선호 설정 조회' })
  async findByClientId(@Param('clientId') clientId: string) {
    return this.albumPreferenceService.findByClientId(clientId);
  }

  @Put()
  @ApiOperation({ summary: '거래처 앨범 선호 설정 저장 (upsert)' })
  async upsert(
    @Param('clientId') clientId: string,
    @Body() dto: UpsertClientAlbumPreferenceDto,
  ) {
    return this.albumPreferenceService.upsert(clientId, dto);
  }
}

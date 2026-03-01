import {
  Controller,
  Get,
  Put,
  Body,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PhotographerProfileService } from '../services/photographer-profile.service';
import { UpsertPhotographerProfileDto } from '../dto/photographer-profile.dto';

@ApiTags('포토그래퍼 프로필')
@ApiBearerAuth()
@Controller('photographer-profile')
export class PhotographerProfileController {
  constructor(
    private readonly profileService: PhotographerProfileService,
  ) {}

  @Get()
  @ApiOperation({ summary: '내 포토그래퍼 프로필 조회' })
  async getProfile(@Request() req: any) {
    return this.profileService.getProfile(req.user.clientId);
  }

  @Put()
  @ApiOperation({ summary: '포토그래퍼 프로필 등록/수정' })
  async upsertProfile(
    @Request() req: any,
    @Body() dto: UpsertPhotographerProfileDto,
  ) {
    return this.profileService.upsertProfile(req.user.clientId, dto);
  }

  @Get('/regions')
  @ApiOperation({ summary: '한국 행정구역 목록 (시/도 → 시/군/구)' })
  async getRegions() {
    return this.profileService.getRegions();
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { KakaoMapService } from '../services/kakao-map.service';

@ApiTags('place-search')
@Controller('place-search')
export class PlaceSearchController {
  constructor(private readonly kakaoMapService: KakaoMapService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'keyword', required: true })
  @ApiQuery({ name: 'size', required: false })
  async searchPlaces(
    @Query('keyword') keyword: string,
    @Query('size') size?: string,
  ) {
    if (!keyword || keyword.trim().length < 2) {
      return [];
    }
    return this.kakaoMapService.searchPlaces(keyword.trim(), size ? parseInt(size) : 5);
  }
}

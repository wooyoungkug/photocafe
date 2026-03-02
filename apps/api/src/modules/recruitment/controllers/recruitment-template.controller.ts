import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RecruitmentTemplateService } from '../services/recruitment-template.service';
import {
  CreateRecruitmentTemplateDto,
  UpdateRecruitmentTemplateDto,
} from '../dto/recruitment-template.dto';

@ApiTags('구인 자주사용 문구')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recruitment-templates')
export class RecruitmentTemplateController {
  constructor(private readonly templateService: RecruitmentTemplateService) {}

  @Get()
  @ApiOperation({ summary: '자주사용 문구 목록' })
  async findAll(@Request() req: any, @Query('category') category?: string) {
    const clientId = req.user.clientId;
    if (!clientId) throw new BadRequestException('거래처 계정이 필요합니다');
    return this.templateService.findAll(clientId, category);
  }

  @Post()
  @ApiOperation({ summary: '자주사용 문구 등록' })
  async create(@Body() dto: CreateRecruitmentTemplateDto, @Request() req: any) {
    const clientId = req.user.clientId;
    if (!clientId) throw new BadRequestException('거래처 계정이 필요합니다');
    return this.templateService.create(clientId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '자주사용 문구 수정' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRecruitmentTemplateDto,
    @Request() req: any,
  ) {
    const clientId = req.user.clientId;
    if (!clientId) throw new BadRequestException('거래처 계정이 필요합니다');
    return this.templateService.update(id, clientId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '자주사용 문구 삭제' })
  async remove(@Param('id') id: string, @Request() req: any) {
    const clientId = req.user.clientId;
    if (!clientId) throw new BadRequestException('거래처 계정이 필요합니다');
    return this.templateService.remove(id, clientId);
  }
}

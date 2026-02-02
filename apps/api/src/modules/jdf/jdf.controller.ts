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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { JdfService } from './jdf.service';
import {
  CreateColorIntentDto,
  UpdateColorIntentDto,
  CreateBindingIntentDto,
  UpdateBindingIntentDto,
  CreateFoldingIntentDto,
  UpdateFoldingIntentDto,
  CreateFileSpecDto,
  UpdateFileSpecDto,
  CreateQualityControlDto,
  UpdateQualityControlDto,
  CreateProofingIntentDto,
  UpdateProofingIntentDto,
} from './dto/jdf.dto';

@ApiTags('JDF')
@Controller('jdf')
export class JdfController {
  constructor(private readonly jdfService: JdfService) {}

  // ==================== 전체 JDF Intent 조회 ====================
  @Get()
  @ApiOperation({ summary: '전체 JDF Intent 조회' })
  async findAllJdfIntents() {
    return this.jdfService.findAllJdfIntents();
  }

  // ==================== ColorIntent ====================
  @Get('color-intents')
  @ApiOperation({ summary: '색상 의도 목록 조회' })
  async findAllColorIntents(@Query('includeInactive') includeInactive?: string) {
    return this.jdfService.findAllColorIntents(includeInactive === 'true');
  }

  @Get('color-intents/:id')
  @ApiOperation({ summary: '색상 의도 상세 조회' })
  async findColorIntentById(@Param('id') id: string) {
    return this.jdfService.findColorIntentById(id);
  }

  @Post('color-intents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '색상 의도 생성' })
  async createColorIntent(@Body() dto: CreateColorIntentDto) {
    return this.jdfService.createColorIntent(dto);
  }

  @Put('color-intents/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '색상 의도 수정' })
  async updateColorIntent(@Param('id') id: string, @Body() dto: UpdateColorIntentDto) {
    return this.jdfService.updateColorIntent(id, dto);
  }

  @Delete('color-intents/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '색상 의도 삭제' })
  async deleteColorIntent(@Param('id') id: string) {
    return this.jdfService.deleteColorIntent(id);
  }

  // ==================== BindingIntent ====================
  @Get('binding-intents')
  @ApiOperation({ summary: '제본 의도 목록 조회' })
  async findAllBindingIntents(@Query('includeInactive') includeInactive?: string) {
    return this.jdfService.findAllBindingIntents(includeInactive === 'true');
  }

  @Get('binding-intents/:id')
  @ApiOperation({ summary: '제본 의도 상세 조회' })
  async findBindingIntentById(@Param('id') id: string) {
    return this.jdfService.findBindingIntentById(id);
  }

  @Post('binding-intents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '제본 의도 생성' })
  async createBindingIntent(@Body() dto: CreateBindingIntentDto) {
    return this.jdfService.createBindingIntent(dto);
  }

  @Put('binding-intents/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '제본 의도 수정' })
  async updateBindingIntent(@Param('id') id: string, @Body() dto: UpdateBindingIntentDto) {
    return this.jdfService.updateBindingIntent(id, dto);
  }

  @Delete('binding-intents/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '제본 의도 삭제' })
  async deleteBindingIntent(@Param('id') id: string) {
    return this.jdfService.deleteBindingIntent(id);
  }

  // ==================== FoldingIntent ====================
  @Get('folding-intents')
  @ApiOperation({ summary: '접지 의도 목록 조회' })
  async findAllFoldingIntents(@Query('includeInactive') includeInactive?: string) {
    return this.jdfService.findAllFoldingIntents(includeInactive === 'true');
  }

  @Get('folding-intents/:id')
  @ApiOperation({ summary: '접지 의도 상세 조회' })
  async findFoldingIntentById(@Param('id') id: string) {
    return this.jdfService.findFoldingIntentById(id);
  }

  @Post('folding-intents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '접지 의도 생성' })
  async createFoldingIntent(@Body() dto: CreateFoldingIntentDto) {
    return this.jdfService.createFoldingIntent(dto);
  }

  @Put('folding-intents/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '접지 의도 수정' })
  async updateFoldingIntent(@Param('id') id: string, @Body() dto: UpdateFoldingIntentDto) {
    return this.jdfService.updateFoldingIntent(id, dto);
  }

  @Delete('folding-intents/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '접지 의도 삭제' })
  async deleteFoldingIntent(@Param('id') id: string) {
    return this.jdfService.deleteFoldingIntent(id);
  }

  // ==================== ProofingIntent ====================
  @Get('proofing-intents')
  @ApiOperation({ summary: '교정 의도 목록 조회' })
  async findAllProofingIntents(@Query('includeInactive') includeInactive?: string) {
    return this.jdfService.findAllProofingIntents(includeInactive === 'true');
  }

  @Get('proofing-intents/:id')
  @ApiOperation({ summary: '교정 의도 상세 조회' })
  async findProofingIntentById(@Param('id') id: string) {
    return this.jdfService.findProofingIntentById(id);
  }

  @Post('proofing-intents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '교정 의도 생성' })
  async createProofingIntent(@Body() dto: CreateProofingIntentDto) {
    return this.jdfService.createProofingIntent(dto);
  }

  @Put('proofing-intents/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '교정 의도 수정' })
  async updateProofingIntent(@Param('id') id: string, @Body() dto: UpdateProofingIntentDto) {
    return this.jdfService.updateProofingIntent(id, dto);
  }

  @Delete('proofing-intents/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '교정 의도 삭제' })
  async deleteProofingIntent(@Param('id') id: string) {
    return this.jdfService.deleteProofingIntent(id);
  }

  // ==================== FileSpec ====================
  @Get('file-specs')
  @ApiOperation({ summary: '파일 규격 목록 조회' })
  async findAllFileSpecs(@Query('includeInactive') includeInactive?: string) {
    return this.jdfService.findAllFileSpecs(includeInactive === 'true');
  }

  @Get('file-specs/:id')
  @ApiOperation({ summary: '파일 규격 상세 조회' })
  async findFileSpecById(@Param('id') id: string) {
    return this.jdfService.findFileSpecById(id);
  }

  @Post('file-specs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '파일 규격 생성' })
  async createFileSpec(@Body() dto: CreateFileSpecDto) {
    return this.jdfService.createFileSpec(dto);
  }

  @Put('file-specs/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '파일 규격 수정' })
  async updateFileSpec(@Param('id') id: string, @Body() dto: UpdateFileSpecDto) {
    return this.jdfService.updateFileSpec(id, dto);
  }

  @Delete('file-specs/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '파일 규격 삭제' })
  async deleteFileSpec(@Param('id') id: string) {
    return this.jdfService.deleteFileSpec(id);
  }

  // ==================== QualityControl ====================
  @Get('quality-controls')
  @ApiOperation({ summary: '품질 기준 목록 조회' })
  async findAllQualityControls(@Query('includeInactive') includeInactive?: string) {
    return this.jdfService.findAllQualityControls(includeInactive === 'true');
  }

  @Get('quality-controls/:id')
  @ApiOperation({ summary: '품질 기준 상세 조회' })
  async findQualityControlById(@Param('id') id: string) {
    return this.jdfService.findQualityControlById(id);
  }

  @Post('quality-controls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '품질 기준 생성' })
  async createQualityControl(@Body() dto: CreateQualityControlDto) {
    return this.jdfService.createQualityControl(dto);
  }

  @Put('quality-controls/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '품질 기준 수정' })
  async updateQualityControl(@Param('id') id: string, @Body() dto: UpdateQualityControlDto) {
    return this.jdfService.updateQualityControl(id, dto);
  }

  @Delete('quality-controls/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '품질 기준 삭제' })
  async deleteQualityControl(@Param('id') id: string) {
    return this.jdfService.deleteQualityControl(id);
  }
}

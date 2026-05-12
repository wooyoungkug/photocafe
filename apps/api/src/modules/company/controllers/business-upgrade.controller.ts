import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { StaffOnlyGuard } from '@/common/guards/staff-only.guard';
import { BusinessUpgradeService } from '../services/business-upgrade.service';
import { BusinessCertOcrService } from '../services/business-cert-ocr.service';
import {
  BusinessUpgradeRequestDto,
  ProcessBusinessUpgradeDto,
  AnalyzeCertDto,
  AnalyzeCertResultDto,
  VerifyBusinessStatusDto,
  VerifyBusinessStatusResultDto,
} from '../dto';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class BusinessUpgradeController {
  constructor(
    private businessUpgradeService: BusinessUpgradeService,
    private businessCertOcrService: BusinessCertOcrService,
  ) {}

  // ==================== 회원 본인 ====================

  @Post('me/business-upgrade/analyze-cert')
  @ApiOperation({
    summary: '사업자등록증 OCR 자동 인식',
    description:
      'B2 private 버킷에 업로드된 사업자등록증(POST /upload/business-cert 의 uploadKey)을 Naver CLOVA OCR 로 분석하여 사업자번호·대표자·업태·종목·주소 등을 추출합니다.',
  })
  @ApiBody({ type: AnalyzeCertDto })
  @ApiResponse({ status: 200, type: AnalyzeCertResultDto, description: 'OCR 인식 결과' })
  @ApiResponse({ status: 503, description: 'OCR 서비스가 설정되지 않음' })
  async analyzeCert(@Request() req: any, @Body() dto: AnalyzeCertDto): Promise<AnalyzeCertResultDto> {
    this.assertClient(req);
    return this.businessCertOcrService.analyzeCert(dto.uploadKey);
  }

  @Post('me/business-upgrade/verify-status')
  @ApiOperation({
    summary: '국세청 사업자 상태 조회',
    description: '국세청(data.go.kr) 사업자등록 상태조회 API 로 계속/휴업/폐업 여부와 과세유형을 확인합니다.',
  })
  @ApiBody({ type: VerifyBusinessStatusDto })
  @ApiResponse({ status: 200, type: VerifyBusinessStatusResultDto, description: '사업자 상태 조회 결과' })
  @ApiResponse({ status: 503, description: '국세청 연동이 설정되지 않음' })
  async verifyStatus(
    @Request() req: any,
    @Body() dto: VerifyBusinessStatusDto,
  ): Promise<VerifyBusinessStatusResultDto> {
    this.assertClient(req);
    return this.businessCertOcrService.verifyStatus(dto.businessNumber);
  }

  @Post('me/business-upgrade')
  @ApiOperation({ summary: '사업자 회원 전환 신청 (마이페이지)' })
  async requestUpgrade(@Request() req: any, @Body() dto: BusinessUpgradeRequestDto) {
    this.assertClient(req);
    return this.businessUpgradeService.requestUpgrade(req.user.clientId || req.user.sub, dto);
  }

  @Get('me/business-upgrade')
  @ApiOperation({ summary: '내 사업자 회원 전환 신청 상태 조회' })
  async getMyUpgradeStatus(@Request() req: any) {
    this.assertClient(req);
    return this.businessUpgradeService.getMyUpgradeStatus(req.user.clientId || req.user.sub);
  }

  @Get('me/business-cert-url')
  @ApiOperation({ summary: '내가 제출한 사업자등록증 다운로드 URL (5분 유효)' })
  async getMyCertUrl(@Request() req: any) {
    this.assertClient(req);
    return this.businessUpgradeService.getMyCertUrl(req.user.clientId || req.user.sub);
  }

  // ==================== 관리자 ====================

  @Get('business-upgrade-requests')
  @UseGuards(StaffOnlyGuard)
  @ApiOperation({ summary: '[관리자] 사업자 회원 전환 신청 목록' })
  @ApiQuery({ name: 'status', required: false, description: '기본값 pending (pending|approved|rejected)' })
  async listRequests(@Query('status') status?: string) {
    return this.businessUpgradeService.listRequests(status || 'pending');
  }

  @Get(':id/business-cert-url')
  @UseGuards(StaffOnlyGuard)
  @ApiOperation({ summary: '[관리자] 회원의 사업자등록증 다운로드 URL (5분 유효)' })
  async getCertUrl(@Param('id') id: string) {
    return this.businessUpgradeService.getCertUrl(id);
  }

  @Patch(':id/business-upgrade')
  @UseGuards(StaffOnlyGuard)
  @ApiOperation({ summary: '[관리자] 사업자 회원 전환 신청 승인/반려' })
  async process(@Param('id') id: string, @Body() dto: ProcessBusinessUpgradeDto) {
    return this.businessUpgradeService.process(id, dto);
  }

  private assertClient(req: any) {
    if (req.user?.type === 'staff') {
      throw new ForbiddenException('회원 계정으로만 사업자 전환을 신청할 수 있습니다');
    }
  }
}

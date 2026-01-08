import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductionGroupService } from '../services/production-group.service';
import {
  CreateProductionGroupDto,
  UpdateProductionGroupDto,
  ProductionGroupQueryDto,
  CreateProductionSettingDto,
  UpdateProductionSettingDto,
  ProductionSettingQueryDto,
  UpdateSpecificationsDto,
  UpdatePricesDto,
  PRICING_TYPES,
  PRICING_TYPE_LABELS,
} from '../dto';

@ApiTags('생산설정')
@Controller('production')
export class ProductionGroupController {
  constructor(private productionGroupService: ProductionGroupService) { }

  // ==================== 생산그룹 ====================

  @Get('groups')
  @ApiOperation({ summary: '생산그룹 목록 조회' })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'depth', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAllGroups(@Query() query: ProductionGroupQueryDto) {
    return this.productionGroupService.findAllGroups(query);
  }

  @Get('groups/tree')
  @ApiOperation({ summary: '생산그룹 트리 조회' })
  async findGroupTree() {
    return this.productionGroupService.findGroupTree();
  }

  @Get('groups/:id')
  @ApiOperation({ summary: '생산그룹 상세 조회' })
  async findGroupById(@Param('id') id: string) {
    return this.productionGroupService.findGroupById(id);
  }

  @Post('groups')
  @ApiOperation({ summary: '생산그룹 생성' })
  async createGroup(@Body() data: CreateProductionGroupDto) {
    return this.productionGroupService.createGroup(data);
  }

  @Put('groups/:id')
  @ApiOperation({ summary: '생산그룹 수정' })
  async updateGroup(@Param('id') id: string, @Body() data: UpdateProductionGroupDto) {
    return this.productionGroupService.updateGroup(id, data);
  }

  @Delete('groups/:id')
  @ApiOperation({ summary: '생산그룹 삭제' })
  async deleteGroup(@Param('id') id: string) {
    return this.productionGroupService.deleteGroup(id);
  }

  @Post('groups/:id/move-up')
  @ApiOperation({ summary: '생산그룹 위로 이동' })
  async moveGroupUp(@Param('id') id: string) {
    return this.productionGroupService.moveGroupUp(id);
  }

  @Post('groups/:id/move-down')
  @ApiOperation({ summary: '생산그룹 아래로 이동' })
  async moveGroupDown(@Param('id') id: string) {
    return this.productionGroupService.moveGroupDown(id);
  }

  // ==================== 생산설정 ====================

  @Get('settings')
  @ApiOperation({ summary: '생산설정 목록 조회' })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'pricingType', required: false, enum: PRICING_TYPES })
  @ApiQuery({ name: 'isActive', required: false })
  async findAllSettings(@Query() query: ProductionSettingQueryDto) {
    return this.productionGroupService.findAllSettings(query);
  }

  @Get('settings/pricing-types')
  @ApiOperation({ summary: '가격 계산 방식 목록' })
  async getPricingTypes() {
    return PRICING_TYPES.map(type => ({
      value: type,
      label: PRICING_TYPE_LABELS[type],
    }));
  }

  @Get('settings/:id')
  @ApiOperation({ summary: '생산설정 상세 조회' })
  async findSettingById(@Param('id') id: string) {
    return this.productionGroupService.findSettingById(id);
  }

  @Post('settings')
  @ApiOperation({ summary: '생산설정 생성' })
  async createSetting(@Body() data: CreateProductionSettingDto) {
    return this.productionGroupService.createSetting(data);
  }

  @Put('settings/:id')
  @ApiOperation({ summary: '생산설정 수정' })
  async updateSetting(@Param('id') id: string, @Body() data: UpdateProductionSettingDto) {
    return this.productionGroupService.updateSetting(id, data);
  }

  @Delete('settings/:id')
  @ApiOperation({ summary: '생산설정 삭제' })
  async deleteSetting(@Param('id') id: string) {
    return this.productionGroupService.deleteSetting(id);
  }

  @Put('settings/:id/specifications')
  @ApiOperation({ summary: '생산설정 규격 연결 수정' })
  async updateSettingSpecifications(
    @Param('id') id: string,
    @Body() data: UpdateSpecificationsDto,
  ) {
    return this.productionGroupService.updateSettingSpecifications(id, data);
  }

  @Put('settings/:id/prices')
  @ApiOperation({ summary: '생산설정 가격표 수정' })
  async updateSettingPrices(
    @Param('id') id: string,
    @Body() data: UpdatePricesDto,
  ) {
    return this.productionGroupService.updateSettingPrices(id, data);
  }

  @Post('settings/:id/move-up')
  @ApiOperation({ summary: '생산설정 위로 이동' })
  async moveSettingUp(@Param('id') id: string) {
    return this.productionGroupService.moveSettingUp(id);
  }

  @Post('settings/:id/move-down')
  @ApiOperation({ summary: '생산설정 아래로 이동' })
  async moveSettingDown(@Param('id') id: string) {
    return this.productionGroupService.moveSettingDown(id);
  }
}

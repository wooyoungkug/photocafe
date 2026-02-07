import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientAddressService } from '../services/client-address.service';
import { CreateClientAddressDto, UpdateClientAddressDto } from '../dto/client-address.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('client-addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients/:clientId/addresses')
export class ClientAddressController {
  constructor(private clientAddressService: ClientAddressService) {}

  @Get()
  @ApiOperation({ summary: '배송지 목록 조회' })
  async findAll(@Param('clientId') clientId: string) {
    return this.clientAddressService.findAll(clientId);
  }

  @Post()
  @ApiOperation({ summary: '배송지 추가' })
  async create(
    @Param('clientId') clientId: string,
    @Body() dto: CreateClientAddressDto,
  ) {
    return this.clientAddressService.create(clientId, dto);
  }

  @Get(':addressId')
  @ApiOperation({ summary: '배송지 상세 조회' })
  async findOne(
    @Param('clientId') clientId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.clientAddressService.findOne(clientId, addressId);
  }

  @Patch(':addressId')
  @ApiOperation({ summary: '배송지 수정' })
  async update(
    @Param('clientId') clientId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateClientAddressDto,
  ) {
    return this.clientAddressService.update(clientId, addressId, dto);
  }

  @Delete(':addressId')
  @ApiOperation({ summary: '배송지 삭제' })
  async delete(
    @Param('clientId') clientId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.clientAddressService.delete(clientId, addressId);
  }

  @Patch(':addressId/default')
  @ApiOperation({ summary: '기본 배송지 설정' })
  async setDefault(
    @Param('clientId') clientId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.clientAddressService.setDefault(clientId, addressId);
  }
}

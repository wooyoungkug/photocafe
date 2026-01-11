import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SpecificationService } from './specification.service';
import { CreateSpecificationDto, UpdateSpecificationDto, SpecificationQueryDto } from './dto';

@ApiTags('specifications')
@Controller('specifications')
export class SpecificationController {
    constructor(private readonly specificationService: SpecificationService) { }

    @Get()
    @ApiOperation({ summary: '규격 목록 조회' })
    @ApiResponse({ status: 200, description: '규격 목록 반환' })
    async findAll(@Query() query: SpecificationQueryDto) {
        return this.specificationService.findAll(query);
    }

    @Get('usage/:usage')
    @ApiOperation({ summary: '용도별 규격 목록 조회' })
    @ApiResponse({ status: 200, description: '용도별 규격 목록 반환' })
    async findByUsage(@Param('usage') usage: 'indigo' | 'inkjet' | 'album' | 'frame' | 'booklet') {
        return this.specificationService.findByUsage(usage);
    }

    @Get(':id')
    @ApiOperation({ summary: '규격 상세 조회' })
    @ApiResponse({ status: 200, description: '규격 상세 정보 반환' })
    @ApiResponse({ status: 404, description: '규격을 찾을 수 없음' })
    async findOne(@Param('id') id: string) {
        return this.specificationService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: '규격 생성' })
    @ApiResponse({ status: 201, description: '규격 생성 완료' })
    async create(@Body() dto: CreateSpecificationDto) {
        return this.specificationService.create(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: '규격 수정' })
    @ApiResponse({ status: 200, description: '규격 수정 완료' })
    @ApiResponse({ status: 404, description: '규격을 찾을 수 없음' })
    async update(@Param('id') id: string, @Body() dto: UpdateSpecificationDto) {
        return this.specificationService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: '규격 삭제' })
    @ApiResponse({ status: 204, description: '규격 삭제 완료' })
    @ApiResponse({ status: 404, description: '규격을 찾을 수 없음' })
    async delete(@Param('id') id: string) {
        return this.specificationService.delete(id);
    }

    @Post('reorder')
    @ApiOperation({ summary: '규격 정렬순서 변경' })
    @ApiResponse({ status: 200, description: '정렬순서 변경 완료' })
    async reorder(@Body() items: { id: string; sortOrder: number }[]) {
        return this.specificationService.updateSortOrder(items);
    }
}

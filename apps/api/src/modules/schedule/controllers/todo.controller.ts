import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { TodoService } from '../services/todo.service';
import { CreateTodoDto, UpdateTodoDto, QueryTodoDto } from '../dto';

@ApiTags('할일 관리')
@Controller('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '할일 생성' })
  create(@Body() dto: CreateTodoDto, @Req() req: any) {
    const user = this.extractUser(req);
    return this.todoService.create(dto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '할일 목록 조회' })
  findAll(@Query() query: QueryTodoDto, @Req() req: any) {
    const user = this.extractUser(req);
    return this.todoService.findAll(query, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '할일 상세 조회' })
  findOne(@Param('id') id: string, @Req() req: any) {
    const user = this.extractUser(req);
    return this.todoService.findOne(id, user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '할일 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateTodoDto, @Req() req: any) {
    const user = this.extractUser(req);
    return this.todoService.update(id, dto, user);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '할일 완료 처리' })
  complete(@Param('id') id: string, @Req() req: any) {
    const user = this.extractUser(req);
    return this.todoService.complete(id, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '할일 삭제 (담당자, 부서장, 관리자만)' })
  delete(@Param('id') id: string, @Req() req: any) {
    const user = this.extractUser(req);
    return this.todoService.delete(id, user);
  }

  // 사용자 정보 추출 (임시 - 실제로는 JWT에서 추출)
  private extractUser(req: any) {
    // JWT에서 사용자 정보 추출 (실제 구현에서는 req.user 사용)
    return req.user || {
      id: 'staff-1',
      name: '관리자',
      departmentId: 'dept-1',
      departmentName: '관리팀',
      role: 'admin',
    };
  }
}

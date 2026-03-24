import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { TodoController, ScheduleController, MemoController } from './controllers';
import { TodoService, ScheduleService, MemoService } from './services';

@Module({
  imports: [PrismaModule],
  controllers: [TodoController, ScheduleController, MemoController],
  providers: [TodoService, ScheduleService, MemoService],
  exports: [TodoService, ScheduleService, MemoService],
})
export class ScheduleModule {}

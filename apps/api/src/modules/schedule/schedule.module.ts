import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import {
  TodoController,
  ScheduleController,
  MemoController,
  NotebookController,
} from './controllers';
import {
  TodoService,
  ScheduleService,
  MemoService,
  NotebookService,
} from './services';

@Module({
  imports: [PrismaModule],
  controllers: [TodoController, ScheduleController, MemoController, NotebookController],
  providers: [TodoService, ScheduleService, MemoService, NotebookService],
  exports: [TodoService, ScheduleService, MemoService, NotebookService],
})
export class ScheduleModule {}

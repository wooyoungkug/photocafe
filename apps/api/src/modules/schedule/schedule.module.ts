import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import {
  TodoController,
  ScheduleController,
  MemoController,
  NotebookController,
  NoteTagController,
} from './controllers';
import {
  TodoService,
  ScheduleService,
  MemoService,
  NotebookService,
  NoteTagService,
} from './services';

@Module({
  imports: [PrismaModule],
  controllers: [
    TodoController,
    ScheduleController,
    MemoController,
    NotebookController,
    NoteTagController,
  ],
  providers: [TodoService, ScheduleService, MemoService, NotebookService, NoteTagService],
  exports: [TodoService, ScheduleService, MemoService, NotebookService, NoteTagService],
})
export class ScheduleModule {}

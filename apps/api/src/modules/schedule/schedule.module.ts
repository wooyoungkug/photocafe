import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UploadModule } from '@/modules/upload/upload.module';
import {
  TodoController,
  ScheduleController,
  MemoController,
  NoteController,
  NotebookController,
  NoteTagController,
  NoteAttachmentController,
} from './controllers';
import {
  TodoService,
  ScheduleService,
  MemoService,
  NoteService,
  NotebookService,
  NoteTagService,
  NoteAttachmentService,
} from './services';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [
    TodoController,
    ScheduleController,
    MemoController,
    NoteController,
    NotebookController,
    NoteTagController,
    NoteAttachmentController,
  ],
  providers: [
    TodoService,
    ScheduleService,
    MemoService,
    NoteService,
    NotebookService,
    NoteTagService,
    NoteAttachmentService,
  ],
  exports: [
    TodoService,
    ScheduleService,
    MemoService,
    NoteService,
    NotebookService,
    NoteTagService,
    NoteAttachmentService,
  ],
})
export class ScheduleModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UploadModule } from '@/modules/upload/upload.module';
import {
  TodoController,
  ScheduleController,
  MemoController,
  NotebookController,
  NoteTagController,
  NoteAttachmentController,
} from './controllers';
import {
  TodoService,
  ScheduleService,
  MemoService,
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
    NotebookController,
    NoteTagController,
    NoteAttachmentController,
  ],
  providers: [
    TodoService,
    ScheduleService,
    MemoService,
    NotebookService,
    NoteTagService,
    NoteAttachmentService,
  ],
  exports: [
    TodoService,
    ScheduleService,
    MemoService,
    NotebookService,
    NoteTagService,
    NoteAttachmentService,
  ],
})
export class ScheduleModule {}

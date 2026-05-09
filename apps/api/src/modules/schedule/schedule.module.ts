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
  NoteAiController,
} from './controllers';
import {
  TodoService,
  ScheduleService,
  MemoService,
  NoteService,
  NotebookService,
  NoteTagService,
  NoteAttachmentService,
  NoteAiService,
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
    NoteAiController,
  ],
  providers: [
    TodoService,
    ScheduleService,
    MemoService,
    NoteService,
    NotebookService,
    NoteTagService,
    NoteAttachmentService,
    NoteAiService,
  ],
  exports: [
    TodoService,
    ScheduleService,
    MemoService,
    NoteService,
    NotebookService,
    NoteTagService,
    NoteAttachmentService,
    NoteAiService,
  ],
})
export class ScheduleModule {}

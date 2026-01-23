import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { TodoController, ScheduleController } from './controllers';
import { TodoService, ScheduleService } from './services';

@Module({
  imports: [PrismaModule],
  controllers: [TodoController, ScheduleController],
  providers: [TodoService, ScheduleService],
  exports: [TodoService, ScheduleService],
})
export class ScheduleModule {}

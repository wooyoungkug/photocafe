import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import {
  CommitteeController,
  AgendaController,
  DisciplineController,
} from './controllers';
import {
  CommitteeService,
  AgendaService,
  DisciplineService,
} from './services';

@Module({
  imports: [PrismaModule],
  controllers: [
    CommitteeController,
    AgendaController,
    DisciplineController,
  ],
  providers: [
    CommitteeService,
    AgendaService,
    DisciplineService,
  ],
  exports: [
    CommitteeService,
    AgendaService,
    DisciplineService,
  ],
})
export class HrCommitteeModule {}

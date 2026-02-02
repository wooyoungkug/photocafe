import { Module } from '@nestjs/common';
import { JdfController } from './jdf.controller';
import { JdfService } from './jdf.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JdfController],
  providers: [JdfService],
  exports: [JdfService],
})
export class JdfModule {}

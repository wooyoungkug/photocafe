import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UploadModule } from '@/modules/upload/upload.module';

@Module({
  imports: [TerminusModule, PrismaModule, UploadModule],
  controllers: [HealthController],
})
export class HealthModule {}

import { Module } from '@nestjs/common';
import { ProductionGroupController } from './controllers/production-group.controller';
import { ProductionGroupService } from './services/production-group.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductionGroupController],
  providers: [ProductionGroupService],
  exports: [ProductionGroupService],
})
export class ProductionModule { }

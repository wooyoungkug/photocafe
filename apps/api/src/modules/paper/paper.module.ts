import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { PaperController } from './controllers/paper.controller';
import { PaperManufacturerController } from './controllers/paper-manufacturer.controller';
import { PaperSupplierController } from './controllers/paper-supplier.controller';
// TODO: PaperGroup - Prisma 스키마에 모델 추가 필요
// import { PaperGroupController } from './controllers/paper-group.controller';
import { PaperService } from './services/paper.service';
import { PaperManufacturerService } from './services/paper-manufacturer.service';
import { PaperSupplierService } from './services/paper-supplier.service';
// import { PaperGroupService } from './services/paper-group.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaperController, PaperManufacturerController, PaperSupplierController],
  providers: [PaperService, PaperManufacturerService, PaperSupplierService],
  exports: [PaperService, PaperManufacturerService, PaperSupplierService],
})
export class PaperModule {}

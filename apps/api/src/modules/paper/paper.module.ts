import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { PaperController } from './controllers/paper.controller';
import { PaperManufacturerController } from './controllers/paper-manufacturer.controller';
import { PaperSupplierController } from './controllers/paper-supplier.controller';
import { PaperService } from './services/paper.service';
import { PaperManufacturerService } from './services/paper-manufacturer.service';
import { PaperSupplierService } from './services/paper-supplier.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaperController, PaperManufacturerController, PaperSupplierController],
  providers: [PaperService, PaperManufacturerService, PaperSupplierService],
  exports: [PaperService, PaperManufacturerService, PaperSupplierService],
})
export class PaperModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { PaperController } from './controllers/paper.controller';
import { PaperGroupController } from './controllers/paper-group.controller';
import { PaperManufacturerController } from './controllers/paper-manufacturer.controller';
import { PaperSupplierController } from './controllers/paper-supplier.controller';
import { PaperService } from './services/paper.service';
import { PaperGroupService } from './services/paper-group.service';
import { PaperManufacturerService } from './services/paper-manufacturer.service';
import { PaperSupplierService } from './services/paper-supplier.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaperController, PaperGroupController, PaperManufacturerController, PaperSupplierController],
  providers: [PaperService, PaperGroupService, PaperManufacturerService, PaperSupplierService],
  exports: [PaperService, PaperGroupService, PaperManufacturerService, PaperSupplierService],
})
export class PaperModule {}

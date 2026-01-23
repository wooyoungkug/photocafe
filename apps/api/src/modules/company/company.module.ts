import { Module } from '@nestjs/common';
import { ClientController } from './controllers/client.controller';
import { ClientGroupController } from './controllers/client-group.controller';
import { CategoryController } from './controllers/category.controller';
import { SalesCategoryController } from './controllers/sales-category.controller';
import { CopperPlateController } from './controllers/copper-plate.controller';
import { FabricController } from './controllers/fabric.controller';
import { ClientService } from './services/client.service';
import { ClientGroupService } from './services/client-group.service';
import { CategoryService } from './services/category.service';
import { SalesCategoryService } from './services/sales-category.service';
import { CopperPlateService } from './services/copper-plate.service';
import { FabricService } from './services/fabric.service';

@Module({
  controllers: [
    ClientController,
    ClientGroupController,
    CategoryController,
    SalesCategoryController,
    CopperPlateController,
    FabricController,
  ],
  providers: [
    ClientService,
    ClientGroupService,
    CategoryService,
    SalesCategoryService,
    CopperPlateService,
    FabricService,
  ],
  exports: [
    ClientService,
    ClientGroupService,
    CategoryService,
    SalesCategoryService,
    CopperPlateService,
    FabricService,
  ],
})
export class CompanyModule {}

import { Module } from '@nestjs/common';
import { ClientController } from './controllers/client.controller';
import { ClientAddressController } from './controllers/client-address.controller';
import { ClientGroupController } from './controllers/client-group.controller';
import { CategoryController } from './controllers/category.controller';
import { SalesCategoryController } from './controllers/sales-category.controller';
import { CopperPlateController } from './controllers/copper-plate.controller';
import { FabricController } from './controllers/fabric.controller';
import { ClientAlbumPreferenceController } from './controllers/client-album-preference.controller';
import { ClientService } from './services/client.service';
import { ClientAddressService } from './services/client-address.service';
import { ClientGroupService } from './services/client-group.service';
import { CategoryService } from './services/category.service';
import { SalesCategoryService } from './services/sales-category.service';
import { CopperPlateService } from './services/copper-plate.service';
import { FabricService } from './services/fabric.service';
import { ClientAlbumPreferenceService } from './services/client-album-preference.service';

@Module({
  controllers: [
    ClientController,
    ClientAddressController,
    ClientGroupController,
    CategoryController,
    SalesCategoryController,
    CopperPlateController,
    FabricController,
    ClientAlbumPreferenceController,
  ],
  providers: [
    ClientService,
    ClientAddressService,
    ClientGroupService,
    CategoryService,
    SalesCategoryService,
    CopperPlateService,
    FabricService,
    ClientAlbumPreferenceService,
  ],
  exports: [
    ClientService,
    ClientAddressService,
    ClientGroupService,
    CategoryService,
    SalesCategoryService,
    CopperPlateService,
    FabricService,
    ClientAlbumPreferenceService,
  ],
})
export class CompanyModule {}

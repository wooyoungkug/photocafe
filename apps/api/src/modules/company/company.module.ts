import { Module } from '@nestjs/common';
import { ClientController } from './controllers/client.controller';
import { ClientGroupController } from './controllers/client-group.controller';
import { CategoryController } from './controllers/category.controller';
import { SalesCategoryController } from './controllers/sales-category.controller';
import { ClientService } from './services/client.service';
import { ClientGroupService } from './services/client-group.service';
import { CategoryService } from './services/category.service';
import { SalesCategoryService } from './services/sales-category.service';

@Module({
  controllers: [ClientController, ClientGroupController, CategoryController, SalesCategoryController],
  providers: [ClientService, ClientGroupService, CategoryService, SalesCategoryService],
  exports: [ClientService, ClientGroupService, CategoryService, SalesCategoryService],
})
export class CompanyModule {}

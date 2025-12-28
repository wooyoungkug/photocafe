import { Module } from '@nestjs/common';
import { ClientController } from './controllers/client.controller';
import { ClientGroupController } from './controllers/client-group.controller';
import { CategoryController } from './controllers/category.controller';
import { ClientService } from './services/client.service';
import { ClientGroupService } from './services/client-group.service';
import { CategoryService } from './services/category.service';

@Module({
  controllers: [ClientController, ClientGroupController, CategoryController],
  providers: [ClientService, ClientGroupService, CategoryService],
  exports: [ClientService, ClientGroupService, CategoryService],
})
export class CompanyModule {}

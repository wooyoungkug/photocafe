import { Module } from '@nestjs/common';
import { StaffController } from './controllers/staff.controller';
import { DepartmentController } from './controllers/department.controller';
import { StaffService } from './services/staff.service';
import { DepartmentService } from './services/department.service';

@Module({
  controllers: [StaffController, DepartmentController],
  providers: [StaffService, DepartmentService],
  exports: [StaffService, DepartmentService],
})
export class StaffModule {}

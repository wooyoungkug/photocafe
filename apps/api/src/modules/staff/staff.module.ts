import { Module } from '@nestjs/common';
import { StaffController } from './controllers/staff.controller';
import { DepartmentController } from './controllers/department.controller';
import { BranchController } from './controllers/branch.controller';
import { StaffService } from './services/staff.service';
import { DepartmentService } from './services/department.service';
import { BranchService } from './services/branch.service';

@Module({
  controllers: [StaffController, DepartmentController, BranchController],
  providers: [StaffService, DepartmentService, BranchService],
  exports: [StaffService, DepartmentService, BranchService],
})
export class StaffModule {}

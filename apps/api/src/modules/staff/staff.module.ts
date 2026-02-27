import { Module } from '@nestjs/common';
import { StaffController } from './controllers/staff.controller';
import { DepartmentController } from './controllers/department.controller';
import { BranchController } from './controllers/branch.controller';
import { TeamController } from './controllers/team.controller';
import { StaffService } from './services/staff.service';
import { DepartmentService } from './services/department.service';
import { BranchService } from './services/branch.service';
import { TeamService } from './services/team.service';

@Module({
  controllers: [StaffController, DepartmentController, BranchController, TeamController],
  providers: [StaffService, DepartmentService, BranchService, TeamService],
  exports: [StaffService, DepartmentService, BranchService, TeamService],
})
export class StaffModule {}

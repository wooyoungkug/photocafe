import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import {
  LeaveTypeController,
  LeaveBalanceController,
  LeaveRequestController,
  LeaveCalendarController,
  MinStaffingController,
} from './controllers';
import {
  LeaveTypeService,
  LeaveBalanceService,
  LeaveRequestService,
  LeaveCalendarService,
  MinStaffingService,
} from './services';

@Module({
  imports: [PrismaModule],
  controllers: [
    LeaveTypeController,
    LeaveBalanceController,
    LeaveRequestController,
    LeaveCalendarController,
    MinStaffingController,
  ],
  providers: [
    LeaveTypeService,
    LeaveBalanceService,
    LeaveRequestService,
    LeaveCalendarService,
    MinStaffingService,
  ],
  exports: [
    LeaveTypeService,
    LeaveBalanceService,
    LeaveRequestService,
    LeaveCalendarService,
    MinStaffingService,
  ],
})
export class LeaveModule {}

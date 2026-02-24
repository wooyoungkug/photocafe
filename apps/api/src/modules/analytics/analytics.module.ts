import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { SuspiciousIpController } from './suspicious-ip.controller';
import { SuspiciousIpService } from './suspicious-ip.service';

@Module({
  controllers: [AnalyticsController, SuspiciousIpController],
  providers: [AnalyticsService, SuspiciousIpService],
  exports: [SuspiciousIpService],
})
export class AnalyticsModule {}

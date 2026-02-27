import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { ProductModule } from './modules/product/product.module';
import { HalfProductModule } from './modules/half-product/half-product.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { OrderModule } from './modules/order/order.module';
import { ReturnModule } from './modules/return/return.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { UploadModule } from './modules/upload/upload.module';
import { SpecificationModule } from './modules/specification/specification.module';
import { ProductionModule } from './modules/production/production.module';
import { StaffModule } from './modules/staff/staff.module';
import { PaperModule } from './modules/paper/paper.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { ConsultationModule } from './modules/consultation/consultation.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { JdfModule } from './modules/jdf/jdf.module';
import { PublicCopperPlateModule } from './modules/public-copper-plate/public-copper-plate.module';
import { MyProductModule } from './modules/my-product/my-product.module';
import { ToolUsageModule } from './modules/tool-usage/tool-usage.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { IpBlockMiddleware } from './modules/analytics/ip-block.middleware';
import { PrismaModule } from './common/prisma/prisma.module';
import { EmailModule } from './common/email/email.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    IpBlockMiddleware,
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,  // 1분 (ms)
        limit: 60,   // 분당 60회 (일반 API)
      },
    ]),
    NestScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    HealthModule,
    AuthModule,
    CompanyModule,
    ProductModule,
    HalfProductModule,
    PricingModule,
    OrderModule,
    ReturnModule,
    StatisticsModule,
    UploadModule,
    SpecificationModule,
    ProductionModule,
    StaffModule,
    PaperModule,
    SystemSettingsModule,
    DeliveryModule,
    ConsultationModule,
    ScheduleModule,
    AccountingModule,
    JdfModule,
    PublicCopperPlateModule,
    MyProductModule,
    ToolUsageModule,
    AnalyticsModule,
    AuditLogModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IpBlockMiddleware).forRoutes('*');
  }
}

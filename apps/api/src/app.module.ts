import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { ProductModule } from './modules/product/product.module';
import { HalfProductModule } from './modules/half-product/half-product.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { OrderModule } from './modules/order/order.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { UploadModule } from './modules/upload/upload.module';
import { SpecificationModule } from './modules/specification/specification.module';
import { ProductionModule } from './modules/production/production.module';
import { StaffModule } from './modules/staff/staff.module';
import { PaperModule } from './modules/paper/paper.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
// import { NotionModule } from './modules/notion/notion.module';  // TODO: npm install @notionhq/client
import { PrismaModule } from './common/prisma/prisma.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    CompanyModule,
    ProductModule,
    HalfProductModule,
    PricingModule,
    OrderModule,
    StatisticsModule,
    UploadModule,
    SpecificationModule,
    ProductionModule,
    StaffModule,
    PaperModule,
    SystemSettingsModule,
    // NotionModule,  // TODO: npm install @notionhq/client
  ],
})
export class AppModule { }


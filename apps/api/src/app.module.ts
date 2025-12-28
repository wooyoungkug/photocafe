import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { ProductModule } from './modules/product/product.module';
import { HalfProductModule } from './modules/half-product/half-product.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { OrderModule } from './modules/order/order.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { NotionModule } from './modules/notion/notion.module';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
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
    NotionModule,
  ],
})
export class AppModule {}

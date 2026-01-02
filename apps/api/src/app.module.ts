import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { ProductModule } from './modules/product/product.module';
import { HalfProductModule } from './modules/half-product/half-product.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { OrderModule } from './modules/order/order.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
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
    // NotionModule,  // TODO: npm install @notionhq/client
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeliveryPricingController } from './controllers/delivery-pricing.controller';
import { DeliveryPricingService } from './services/delivery-pricing.service';
import { KakaoMapService } from './services/kakao-map.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DeliveryPricingController],
  providers: [DeliveryPricingService, KakaoMapService],
  exports: [DeliveryPricingService, KakaoMapService],
})
export class DeliveryModule {}

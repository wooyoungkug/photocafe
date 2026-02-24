import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeliveryPricingController } from './controllers/delivery-pricing.controller';
import { TrackingController } from './controllers/tracking.controller';
import { DeliveryPricingService } from './services/delivery-pricing.service';
import { KakaoMapService } from './services/kakao-map.service';
import { TrackingService } from './services/tracking.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DeliveryPricingController, TrackingController],
  providers: [DeliveryPricingService, KakaoMapService, TrackingService],
  exports: [DeliveryPricingService, KakaoMapService, TrackingService],
})
export class DeliveryModule {}

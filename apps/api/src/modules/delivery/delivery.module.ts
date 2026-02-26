import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeliveryPricingController } from './controllers/delivery-pricing.controller';
import { TrackingController } from './controllers/tracking.controller';
import { ShippingMgmtController } from './controllers/shipping-mgmt.controller';
import { ShippingLabelController } from './controllers/shipping-label.controller';
import { LogenController } from './controllers/logen.controller';
import { DeliveryPricingService } from './services/delivery-pricing.service';
import { KakaoMapService } from './services/kakao-map.service';
import { TrackingService } from './services/tracking.service';
import { ShippingMgmtService } from './services/shipping-mgmt.service';
import { ShippingLabelService } from './services/shipping-label.service';
import { LogenService } from './services/logen.service';
import { TrackingSchedulerService } from './services/tracking-scheduler.service';
import { GoodsflowService } from './services/goodsflow.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [PrismaModule, ConfigModule, SystemSettingsModule],
  controllers: [
    DeliveryPricingController,
    TrackingController,
    ShippingMgmtController,
    ShippingLabelController,
    LogenController,
  ],
  providers: [
    DeliveryPricingService,
    KakaoMapService,
    TrackingService,
    ShippingMgmtService,
    ShippingLabelService,
    LogenService,
    TrackingSchedulerService,
    GoodsflowService,
  ],
  exports: [
    DeliveryPricingService,
    KakaoMapService,
    TrackingService,
    ShippingMgmtService,
    ShippingLabelService,
    LogenService,
    TrackingSchedulerService,
    GoodsflowService,
  ],
})
export class DeliveryModule {}

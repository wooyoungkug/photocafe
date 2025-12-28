import { Module } from "@nestjs/common";
import { PricingController } from "./controllers/pricing.controller";
import { PricingService } from "./services/pricing.service";

@Module({
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}

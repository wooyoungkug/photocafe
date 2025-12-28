import { Module } from "@nestjs/common";
import { HalfProductController } from "./controllers/half-product.controller";
import { HalfProductService } from "./services/half-product.service";

@Module({
  controllers: [HalfProductController],
  providers: [HalfProductService],
  exports: [HalfProductService],
})
export class HalfProductModule {}

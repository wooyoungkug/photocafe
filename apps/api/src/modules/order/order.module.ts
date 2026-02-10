import { Module } from "@nestjs/common";
import { OrderController } from "./controllers/order.controller";
import { OrderService } from "./services/order.service";
import { SystemSettingsModule } from "../system-settings/system-settings.module";

@Module({
  imports: [SystemSettingsModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}

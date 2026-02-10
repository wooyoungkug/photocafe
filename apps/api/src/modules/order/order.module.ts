import { Module } from "@nestjs/common";
import { OrderController } from "./controllers/order.controller";
import { OrderService } from "./services/order.service";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  imports: [AccountingModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}

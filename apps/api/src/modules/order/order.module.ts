import { Module } from "@nestjs/common";
import { OrderController } from "./controllers/order.controller";
import { OrderService } from "./services/order.service";
import { SystemSettingsModule } from "../system-settings/system-settings.module";
import { AccountingModule } from "../accounting/accounting.module";
import { UploadModule } from "../upload/upload.module";

@Module({
  imports: [SystemSettingsModule, AccountingModule, UploadModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}

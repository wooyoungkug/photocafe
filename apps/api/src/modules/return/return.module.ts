import { Module } from '@nestjs/common';
import { ReturnController } from './controllers/return.controller';
import { ReturnService } from './services/return.service';

@Module({
  controllers: [ReturnController],
  providers: [ReturnService],
  exports: [ReturnService],
})
export class ReturnModule {}

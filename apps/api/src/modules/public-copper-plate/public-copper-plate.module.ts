import { Module } from '@nestjs/common';
import { PublicCopperPlateController } from './controllers/public-copper-plate.controller';
import { PublicCopperPlateService } from './services/public-copper-plate.service';

@Module({
  controllers: [PublicCopperPlateController],
  providers: [PublicCopperPlateService],
  exports: [PublicCopperPlateService],
})
export class PublicCopperPlateModule {}

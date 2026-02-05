import { Module } from '@nestjs/common';
import { MyProductController } from './my-product.controller';
import { MyProductService } from './my-product.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MyProductController],
  providers: [MyProductService],
  exports: [MyProductService],
})
export class MyProductModule {}

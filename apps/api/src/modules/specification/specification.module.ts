import { Module } from '@nestjs/common';
import { SpecificationController } from './specification.controller';
import { SpecificationService } from './specification.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SpecificationController],
    providers: [SpecificationService],
    exports: [SpecificationService],
})
export class SpecificationModule { }

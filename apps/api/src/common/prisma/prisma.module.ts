import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CryptoModule } from '../crypto/crypto.module';

@Global()
@Module({
  imports: [CryptoModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

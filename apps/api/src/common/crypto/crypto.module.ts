import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CryptoService } from './crypto.service';

/**
 * 개인정보 암호화 전역 모듈.
 * AppModule 에 한 번 등록하면 모든 모듈에서 CryptoService 주입 가능.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}

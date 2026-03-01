import { Global, Module } from '@nestjs/common';
import { KakaoAlimtalkService } from './kakao-alimtalk.service';

@Global()
@Module({
  providers: [KakaoAlimtalkService],
  exports: [KakaoAlimtalkService],
})
export class KakaoAlimtalkModule {}

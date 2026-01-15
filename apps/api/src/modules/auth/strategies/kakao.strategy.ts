import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('KAKAO_CLIENT_ID') || 'placeholder';
    const clientSecret = configService.get<string>('KAKAO_CLIENT_SECRET') || 'placeholder';
    const callbackURL = configService.get<string>('KAKAO_CALLBACK_URL') || 'http://localhost:3001/api/v1/auth/kakao/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {
      // 카카오 프로필 구조
      const { id, username, _json } = profile;
      const kakaoAccount = _json?.kakao_account;

      const user = await this.authService.validateKakaoUser({
        oauthId: String(id),
        email: kakaoAccount?.email || `kakao_${id}@kakao.com`,
        name: username || kakaoAccount?.profile?.nickname || '카카오사용자',
        profileImage: kakaoAccount?.profile?.profile_image_url,
      });

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}

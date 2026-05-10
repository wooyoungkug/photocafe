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
    const clientID = configService.get<string>('KAKAO_CLIENT_ID');
    const clientSecret = configService.get<string>('KAKAO_CLIENT_SECRET');
    const callbackURL = configService.get<string>('KAKAO_CALLBACK_URL');

    if (!clientID || !clientSecret) {
      console.warn('KAKAO_CLIENT_ID 또는 KAKAO_CLIENT_SECRET이 설정되지 않았습니다. 카카오 로그인이 비활성화됩니다.');
    }

    super({
      clientID: clientID || 'disabled',
      clientSecret: clientSecret || '',
      callbackURL: callbackURL || 'http://localhost:3001/api/v1/auth/kakao/callback',
      scope: ['profile_nickname', 'account_email'],
    } as any);
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

      const email = kakaoAccount?.email;
      // 카카오는 is_email_valid + is_email_verified 모두 true 여야 신뢰 가능
      const verified = kakaoAccount?.is_email_valid === true && kakaoAccount?.is_email_verified === true;

      if (!email || !verified) {
        // 이메일 미동의/미검증 → 가입 차단 (가짜 이메일 fallback 금지)
        return done(null, { _consentRequired: true, _provider: 'kakao' } as any);
      }

      const user = await this.authService.validateKakaoUser({
        oauthId: String(id),
        email,
        name: kakaoAccount?.profile?.nickname || username || '카카오사용자',
        profileImage: kakaoAccount?.profile?.profile_image_url,
        gender: kakaoAccount?.gender,
        birthday: kakaoAccount?.birthday,
        birthyear: kakaoAccount?.birthyear,
        mobile: kakaoAccount?.phone_number,
      });

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}

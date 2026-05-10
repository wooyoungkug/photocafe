import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class CustomerGoogleStrategy extends PassportStrategy(Strategy, 'customer-google') {
  constructor(
    configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CUSTOMER_CALLBACK_URL');

    if (!clientID || !clientSecret) {
      console.warn('GOOGLE_CLIENT_ID 또는 GOOGLE_CLIENT_SECRET이 설정되지 않았습니다. Google 로그인이 비활성화됩니다.');
    }

    super({
      clientID: clientID || 'disabled',
      clientSecret: clientSecret || 'disabled',
      callbackURL: callbackURL || 'http://localhost:3001/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    try {
      const { id, emails, displayName, photos } = profile;

      const primaryEmail = emails?.[0];
      const email = primaryEmail?.value;
      const verified = primaryEmail?.verified === true || primaryEmail?.verified === 'true';

      if (!email || !verified) {
        // 이메일 미동의 또는 미검증 → 가입 차단 (가짜 이메일 fallback 금지)
        return done(null, { _consentRequired: true, _provider: 'google' } as any);
      }

      const user = await this.authService.validateGoogleUser({
        oauthId: id,
        email,
        name: displayName || 'Google사용자',
        profileImage: photos?.[0]?.value,
      });

      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}

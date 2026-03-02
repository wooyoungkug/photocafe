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

      const user = await this.authService.validateGoogleUser({
        oauthId: id,
        email: emails?.[0]?.value || `google_${id}@gmail.com`,
        name: displayName || 'Google사용자',
        profileImage: photos?.[0]?.value,
      });

      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}

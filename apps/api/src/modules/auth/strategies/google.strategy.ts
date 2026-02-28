import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'disabled',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'disabled',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/api/v1/auth/staff/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    try {
      const { id, emails, displayName, photos } = profile;

      const { staff, isNew } = await this.authService.validateStaffOAuth({
        oauthProvider: 'google',
        oauthId: id,
        email: emails?.[0]?.value || `google_${id}@gmail.com`,
        name: displayName || 'Google사용자',
        profileImage: photos?.[0]?.value,
      });

      done(null, { ...staff, isNew });
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}

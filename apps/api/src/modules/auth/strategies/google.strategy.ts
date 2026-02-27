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
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    super({
      clientID: clientID || 'disabled',
      clientSecret: clientSecret || 'disabled',
      callbackURL: callbackURL || 'http://localhost:3001/api/v1/auth/staff/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, emails, displayName, photos } = profile;
      const user = {
        googleId: id,
        email: emails[0].value,
        firstName: displayName,
        picture: photos[0].value,
        accessToken,
      };
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}

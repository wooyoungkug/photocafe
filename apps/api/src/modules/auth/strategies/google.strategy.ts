import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
<<<<<<< HEAD
import { Strategy } from 'passport-google-oauth20';
=======
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
>>>>>>> d0181a6d46768158761ec24a4a11fe6f017771db
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret) {
      console.warn('GOOGLE_CLIENT_ID 또는 GOOGLE_CLIENT_SECRET이 설정되지 않았습니다. 구글 로그인이 비활성화됩니다.');
    }

    super({
      clientID: clientID || 'disabled',
      clientSecret: clientSecret || 'disabled',
<<<<<<< HEAD
      callbackURL: callbackURL || 'http://localhost:3001/api/v1/auth/google/callback',
=======
      callbackURL: callbackURL || 'http://localhost:3001/api/v1/auth/staff/google/callback',
>>>>>>> d0181a6d46768158761ec24a4a11fe6f017771db
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
<<<<<<< HEAD
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {
      // passport-google-oauth20 프로필 구조
      const id = profile.id;
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName;
      const profileImage = profile.photos?.[0]?.value;

      const user = await this.authService.validateGoogleMember({
        oauthId: id,
        email: email || `google_${id}@gmail.com`,
        name: name || '구글사용자',
        profileImage,
      });

      done(null, user);
    } catch (error) {
      done(error, null);
=======
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, emails, displayName, photos } = profile;

      const { staff, isNew } = await this.authService.validateStaffOAuth({
        oauthProvider: 'google',
        oauthId: id,
        email: emails?.[0]?.value || `google_${id}@gmail.com`,
        name: displayName || '구글사용자',
        profileImage: photos?.[0]?.value,
      });

      done(null, { ...staff, isNew });
    } catch (error) {
      done(error as Error, undefined);
>>>>>>> d0181a6d46768158761ec24a4a11fe6f017771db
    }
  }
}

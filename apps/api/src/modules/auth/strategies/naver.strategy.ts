import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-naver-v2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor(
    configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('NAVER_CLIENT_ID') || 'placeholder';
    const clientSecret = configService.get<string>('NAVER_CLIENT_SECRET') || 'placeholder';
    const callbackURL = configService.get<string>('NAVER_CALLBACK_URL') || 'http://localhost:3001/auth/naver/callback';

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
      // passport-naver-v2 프로필 구조
      const { id, email, nickname, profileImage } = profile;

      const user = await this.authService.validateNaverUser({
        oauthId: id,
        email: email || `naver_${id}@naver.com`,
        name: nickname || '네이버사용자',
        profileImage,
      });

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}

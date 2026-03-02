import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-naver-v2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class StaffNaverStrategy extends PassportStrategy(Strategy, 'staff-naver') {
  constructor(
    configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('NAVER_CLIENT_ID');
    const clientSecret = configService.get<string>('NAVER_CLIENT_SECRET');
    const callbackURL = configService.get<string>('STAFF_NAVER_CALLBACK_URL');

    if (!clientID || !clientSecret) {
      console.warn('NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다. 직원 네이버 로그인이 비활성화됩니다.');
    }

    super({
      clientID: clientID || 'disabled',
      clientSecret: clientSecret || 'disabled',
      callbackURL: callbackURL || 'http://localhost:3001/api/v1/auth/staff/naver/callback',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {
      const { id, email, nickname, profileImage, gender, birthday, birthYear, mobile, name } = profile;

      const { staff, isNew } = await this.authService.validateStaffOAuth({
        oauthProvider: 'naver',
        oauthId: id,
        email: email || `naver_${id}@naver.com`,
        name: name || nickname || '네이버사용자',
        profileImage,
        gender: gender,
        birthday: birthday,
        birthyear: birthYear,
        mobile: mobile,
      });

      done(null, { ...staff, isNew });
    } catch (error) {
      done(error, null);
    }
  }
}

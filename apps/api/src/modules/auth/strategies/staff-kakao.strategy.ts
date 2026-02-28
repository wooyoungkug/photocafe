import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class StaffKakaoStrategy extends PassportStrategy(Strategy, 'staff-kakao') {
  constructor(
    configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('KAKAO_CLIENT_ID');
    const clientSecret = configService.get<string>('KAKAO_CLIENT_SECRET');
    const callbackURL = configService.get<string>('STAFF_KAKAO_CALLBACK_URL');

    if (!clientID || !clientSecret) {
      console.warn('KAKAO_CLIENT_ID 또는 KAKAO_CLIENT_SECRET이 설정되지 않았습니다. 직원 카카오 로그인이 비활성화됩니다.');
    }

    super({
      clientID: clientID || 'disabled',
      clientSecret: clientSecret || 'disabled',
      callbackURL: callbackURL || 'http://localhost:3001/api/v1/auth/staff/kakao/callback',
      scope: ['profile_nickname', 'profile_image', 'account_email', 'gender', 'birthday', 'phone_number'],
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {
      const { id, username, _json } = profile;
      const kakaoAccount = _json?.kakao_account;

      const { staff, isNew } = await this.authService.validateStaffOAuth({
        oauthProvider: 'kakao',
        oauthId: String(id),
        email: kakaoAccount?.email || `kakao_${id}@kakao.com`,
        name: username || kakaoAccount?.profile?.nickname || '카카오사용자',
        profileImage: kakaoAccount?.profile?.profile_image_url,
        gender: kakaoAccount?.gender,
        birthday: kakaoAccount?.birthday,
        birthyear: kakaoAccount?.birthyear,
        mobile: kakaoAccount?.phone_number,
      });

      done(null, { ...staff, isNew });
    } catch (error) {
      done(error, null);
    }
  }
}

declare module 'passport-kakao' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface Profile {
    id: string;
    provider: string;
    displayName: string;
    _json: {
      id: number;
      connected_at: string;
      properties?: {
        nickname?: string;
        profile_image?: string;
        thumbnail_image?: string;
      };
      kakao_account?: {
        profile_nickname_needs_agreement?: boolean;
        profile_image_needs_agreement?: boolean;
        profile?: {
          nickname?: string;
          thumbnail_image_url?: string;
          profile_image_url?: string;
          is_default_image?: boolean;
        };
        has_email?: boolean;
        email_needs_agreement?: boolean;
        is_email_valid?: boolean;
        is_email_verified?: boolean;
        email?: string;
      };
    };
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret?: string;
    callbackURL: string;
  }

  export type VerifyCallback = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyCallback);
    name: string;
  }
}

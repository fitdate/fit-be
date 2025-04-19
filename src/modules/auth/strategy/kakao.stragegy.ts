import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { AllConfig } from 'src/common/config/config.types';
import { AuthProvider } from '../types/oatuth.types';
import { AuthService } from '../auth.service';

interface KakaoProfile extends Profile {
  _json: {
    kakao_account?: {
      email?: string;
      profile?: {
        nickname?: string;
      };
    };
    account_email?: string;
    properties?: {
      nickname?: string;
    };
  };
}

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  private readonly logger = new Logger(KakaoStrategy.name);

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly authService: AuthService,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      clientID: configService.getOrThrow('social.kakao.clientId', {
        infer: true,
      }),
      clientSecret: configService.getOrThrow('social.kakao.clientSecret', {
        infer: true,
      }),
      callbackURL: configService.getOrThrow('social.kakao.callbackUrl', {
        infer: true,
      }),
      scope: ['account_email', 'profile_nickname'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    try {
      const kakaoProfile = profile as KakaoProfile;
      const email =
        kakaoProfile._json.kakao_account?.email ||
        kakaoProfile._json.account_email;
      if (!email || email.length === 0) {
        throw new UnauthorizedException(
          '카카오 로그인 실패: 이메일이 없습니다.',
        );
      }
      const name =
        kakaoProfile._json.kakao_account?.profile?.nickname ||
        kakaoProfile._json.properties?.nickname ||
        '';

      const user = await this.authService.processSocialLogin({
        email,
        name,
        authProvider: AuthProvider.KAKAO,
      });

      return {
        ...user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Kakao login error', error);
      throw error;
    }
  }
}

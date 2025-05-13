import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-naver-v2';
import { AllConfig } from 'src/common/config/config.types';
import { AuthProvider } from '../types/oatuth.types';
import { SocialAuthService } from '../services/social-auth.service';
import { Request } from 'express';

type NaverProfile = Profile & {
  emails: { value: string; verified: boolean }[];
  displayName: string;
  _json: {
    email?: string;
  };
};

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  private readonly logger = new Logger(NaverStrategy.name);

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly socialAuthService: SocialAuthService,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      clientID: configService.getOrThrow('social.naver.clientId', {
        infer: true,
      }),
      clientSecret: configService.getOrThrow('social.naver.clientSecret', {
        infer: true,
      }),
      callbackURL: configService.getOrThrow('social.naver.callbackUrlDev', {
        infer: true,
      }),
      scope: ['email', 'profile'],
    });
  }

  // 네이버 로그인 검증
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    req: Request,
  ) {
    try {
      const naverProfile = profile as NaverProfile;
      const email =
        naverProfile.emails[0]?.value || naverProfile._json.email || '';
      if (!email || email.length === 0) {
        throw new UnauthorizedException(
          '네이버 로그인 실패: 이메일이 없습니다.',
        );
      }

      const result = await this.socialAuthService.processSocialLogin(
        {
          email,
          authProvider: AuthProvider.NAVER,
        },
        req,
      );

      return {
        ...result.user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Naver login error', error);
      throw error;
    }
  }
}

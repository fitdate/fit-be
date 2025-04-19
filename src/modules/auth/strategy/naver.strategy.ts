import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-naver';
import { AllConfig } from 'src/common/config/config.types';
import { AuthService } from '../auth.service';
import { AuthProvider } from '../types/oatuth.types';

interface NaverProfile extends Profile {
  emails: { value: string; verified: boolean }[];
  displayName: string;
  _json: {
    email?: string;
  };
}

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  private readonly logger = new Logger(NaverStrategy.name);

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly authService: AuthService,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      clientID: configService.getOrThrow('social.naver.clientId', {
        infer: true,
      }),
      clientSecret: configService.getOrThrow('social.naver.clientSecret', {
        infer: true,
      }),
      callbackURL: configService.getOrThrow('social.naver.callbackUrl', {
        infer: true,
      }),
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    try {
      const naverProfile = profile as NaverProfile;
      const email =
        naverProfile.emails[0]?.value || naverProfile._json.email || '';
      if (!email || email.length === 0) {
        throw new UnauthorizedException(
          '네이버 로그인 실패: 이메일이 없습니다.',
        );
      }
      const name = naverProfile.displayName;

      const user = await this.authService.processSocialLogin({
        email,
        name,
        authProvider: AuthProvider.NAVER,
      });

      return {
        ...user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Naver login error', error);
      throw error;
    }
  }
}

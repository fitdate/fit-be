import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { AuthProvider } from '../types/oatuth.types';
import { AllConfig } from 'src/common/config/config.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AllConfig>,
  ) {
    super({
      clientID: configService.getOrThrow('social.google.clientId', {
        infer: true,
      }),
      clientSecret: configService.getOrThrow('social.google.clientSecret', {
        infer: true,
      }),
      callbackURL: configService.getOrThrow('social.google.callbackUrl', {
        infer: true,
      }),
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    try {
      // 이메일 정보 확인
      if (!profile.emails || profile.emails.length === 0) {
        this.logger.error('이메일 정보를 가져올 수 없습니다.');
        throw new Error('이메일 정보를 가져올 수 없습니다.');
      }
      const email = profile.emails[0].value;
      const familyName = profile?.name?.familyName ?? '';
      const givenName = profile?.name?.givenName ?? '';
      const authProvider = AuthProvider.GOOGLE;

      // 로그인 처리: 없으면 등록 or 기존 유저 반환
      const user = await this.authService.processSocialLogin({
        email,
        name: `${familyName}${givenName}`,
        authProvider,
      });

      return {
        ...user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Google login error', error);
      throw error;
    }
  }
}

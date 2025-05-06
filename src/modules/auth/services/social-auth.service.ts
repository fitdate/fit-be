import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { Request, Response } from 'express';
import { AuthProvider } from '../types/oatuth.types';
import { SocialUserInfo } from '../types/oatuth.types';
import { JwtTokenResponse } from '../types/auth.types';
import { UserService } from '../../user/user.service';
import { TokenService } from './token.service';
import { parseTimeToSeconds } from 'src/common/util/time.util';
import { TokenMetadata } from '../types/token-payload.types';

@Injectable()
export class SocialAuthService {
  protected readonly logger = new Logger(SocialAuthService.name);

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  // 소셜 로그인
  async processSocialLogin(
    userData: SocialUserInfo,
    req: Request,
    origin?: string,
  ): Promise<
    JwtTokenResponse & {
      isProfileComplete: boolean;
      redirectUrl: string;
      user: {
        id: string;
        email: string;
        role: string;
      };
    }
  > {
    let user = await this.userService.findUserByEmail(userData.email);

    if (!user) {
      try {
        const newUser = await this.userService.createSocialUser({
          email: userData.email,
          authProvider: userData.authProvider,
        });
        user = newUser;
      } catch (error) {
        throw new UnauthorizedException(
          '소셜 로그인 사용자 생성에 실패했습니다.',
          {
            cause: error,
          },
        );
      }
    }

    const metadata: TokenMetadata = {
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.role,
      metadata,
    );

    const accessTokenTtl =
      this.configService.get('jwt.accessTokenTtl', { infer: true }) || '30m';
    const refreshTokenTtl =
      this.configService.get('jwt.refreshTokenTtl', { infer: true }) || '7d';

    const accessTokenMaxAge = parseTimeToSeconds(accessTokenTtl) * 1000;
    const refreshTokenMaxAge = parseTimeToSeconds(refreshTokenTtl) * 1000;

    const tokenResponse = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessOptions: this.createCookieOptions(accessTokenMaxAge, origin),
      refreshOptions: this.createCookieOptions(refreshTokenMaxAge, origin),
    };

    const isProfileComplete = user.isProfileComplete || false;
    const redirectPath = isProfileComplete ? '/' : '/complete-profile';

    return {
      ...tokenResponse,
      isProfileComplete,
      redirectUrl: redirectPath,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  // 구글 콜백
  async handleGoogleCallback(
    user: { email: string },
    req: Request,
    res: Response,
  ): Promise<string> {
    return this.handleSocialCallback(user, AuthProvider.GOOGLE, req, res);
  }

  // 카카오 콜백
  async handleKakaoCallback(
    user: { email: string },
    req: Request,
    res: Response,
  ): Promise<string> {
    return this.handleSocialCallback(user, AuthProvider.KAKAO, req, res);
  }

  // 네이버 콜백
  async handleNaverCallback(
    user: { email: string },
    req: Request,
    res: Response,
  ): Promise<string> {
    return this.handleSocialCallback(user, AuthProvider.NAVER, req, res);
  }

  // 소셜 콜백
  async handleSocialCallback(
    user: { email: string },
    authProvider: AuthProvider,
    req: Request,
    res: Response,
  ): Promise<string> {
    this.logger.log(
      `Processing ${authProvider} callback for user: ${user.email}`,
    );
    try {
      const socialUserInfo: SocialUserInfo = {
        email: user.email,
        authProvider,
      };

      const result = await this.processSocialLogin(
        socialUserInfo,
        req,
        req.headers.origin,
      );

      res.cookie('accessToken', result.accessToken, result.accessOptions);
      res.cookie('refreshToken', result.refreshToken, result.refreshOptions);

      const frontendUrl =
        this.configService.get('social.socialFrontendUrl', { infer: true }) ||
        this.configService.get('app.host', { infer: true });

      this.logger.log(
        `Successfully processed ${authProvider} callback for user: ${user.email}`,
      );
      return `${frontendUrl}${result.redirectUrl}`;
    } catch (error) {
      this.logger.error(
        `Failed to process ${authProvider} callback for user: ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new UnauthorizedException(
        `${authProvider} 로그인 처리 중 오류가 발생했습니다.`,
        { cause: error },
      );
    }
  }

  // 쿠키 옵션 생성
  private createCookieOptions(maxAge: number, origin?: string) {
    let domain: string | undefined;

    const configDomain = this.configService.get('app.host', {
      infer: true,
    });
    if (configDomain) {
      domain = configDomain;
    } else if (origin) {
      const hostname = new URL(origin).hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        domain = 'localhost';
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        domain = hostname;
      }
    }

    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge,
      domain: '.fit-date.co.kr',
      path: '/',
    };
  }
}

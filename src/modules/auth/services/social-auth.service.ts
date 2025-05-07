import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { Request, Response } from 'express';
import { AuthProvider } from '../types/oatuth.types';
import { SocialUserInfo } from '../types/oatuth.types';
import { JwtTokenResponse } from '../types/auth.types';
import { UserService } from '../../user/user.service';
import { TokenService } from './token.service';
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

    const tokens = await this.tokenService.generateAndSetTokens(
      user.id,
      user.role,
      metadata,
      origin,
    );

    const tokenResponse = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessOptions: tokens.accessOptions,
      refreshOptions: tokens.refreshOptions,
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
      if (result.refreshToken && result.refreshOptions) {
        res.cookie('refreshToken', result.refreshToken, result.refreshOptions);
      }

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
}

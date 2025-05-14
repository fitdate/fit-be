import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { Request, Response } from 'express';
import { AuthProvider } from '../types/oatuth.types';
import { SocialUserInfo } from '../types/oatuth.types';
import { JwtTokenResponse } from '../types/auth.types';
import { UserService } from '../../user/user.service';
import { TokenService } from '../../token/token.service';
import {
  TokenMetadata,
  TokenPayload,
} from '../../token/types/token-payload.types';
import { v4 as uuidv4 } from 'uuid';
import { SessionService } from '../../session/session.service';
import axios from 'axios';

@Injectable()
export class SocialAuthService {
  protected readonly logger = new Logger(SocialAuthService.name);

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  // 소셜 로그인
  async processSocialLogin(
    userData: SocialUserInfo,
    req: Request,
    redirectUri?: string,
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
    if (redirectUri && !this.validateRedirectUri(redirectUri)) {
      throw new UnauthorizedException('Invalid redirect URI');
    }

    let user = await this.userService.findUserByEmail(userData.email);

    if (!user) {
      try {
        user = await this.userService.createSocialUser({
          email: userData.email,
          authProvider: userData.authProvider,
        });
      } catch (error) {
        throw new UnauthorizedException(
          '소셜 로그인 사용자 생성에 실패했습니다.',
          { cause: error },
        );
      }
    }

    const sessionId = uuidv4();
    const tokenId = uuidv4();

    const userAgentStr = req.headers['user-agent'] || 'unknown';
    const metadata: TokenMetadata = {
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: userAgentStr,
      sessionId,
    };

    await this.sessionService.createSession(user.id, tokenId, metadata);

    const tokenPayload: TokenPayload = {
      sub: user.id,
      role: user.role,
      type: 'access',
      tokenId,
      sessionId,
    };

    const origin = redirectUri || req.headers.origin;
    const tokenResponse = await this.tokenService.generateAndSetTokens(
      user.id,
      tokenPayload,
      origin,
    );

    const isProfileComplete = user.isProfileComplete || false;
    const redirectPath = isProfileComplete
      ? redirectUri || '/'
      : redirectUri
        ? `${redirectUri}?profile=incomplete`
        : '/complete-profile';

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

  // 소셜 콜백
  async handleSocialCallback(
    user: { email: string },
    authProvider: AuthProvider,
    req: Request,
    res: Response,
    redirectUri?: string,
  ): Promise<void> {
    this.logger.log(`${authProvider} 콜백 처리 중: ${user.email}`);
    try {
      const socialUserInfo: SocialUserInfo = {
        email: user.email,
        authProvider,
      };

      const result = await this.processSocialLogin(
        socialUserInfo,
        req,
        redirectUri,
      );

      // 쿠키 설정
      res.cookie('accessToken', result.accessToken, result.accessOptions);
      if (result.refreshToken && result.refreshOptions) {
        res.cookie('refreshToken', result.refreshToken, result.refreshOptions);
      }

      res.redirect(result.redirectUrl);
    } catch (error) {
      this.logger.error(
        `${authProvider} 콜백 처리 실패: ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new UnauthorizedException(
        `${authProvider} 로그인 처리 중 오류가 발생했습니다.`,
        { cause: error },
      );
    }
  }

  // 구글 유저 정보 가져오기
  async getGoogleUserInfo(code: string, redirectUri: string) {
    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: this.configService.getOrThrow('social.google.clientId', {
          infer: true,
        }),
        client_secret: this.configService.getOrThrow(
          'social.google.clientSecret',
          { infer: true },
        ),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
      { headers: { 'Content-Type': 'application/json' } },
    );
    const tokenData: any = tokenRes.data;
    this.logger.log(`구글 tokenData: ${JSON.stringify(tokenData)}`);
    const userRes = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    const userInfo: any = userRes.data;
    this.logger.log(`구글 userInfo: ${JSON.stringify(userInfo)}`);
    return { email: userInfo.email };
  }

  // 카카오 유저 정보 가져오기
  async getKakaoUserInfo(code: string, redirectUri: string) {
    const tokenRes = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.configService.getOrThrow('social.kakao.clientId', {
          infer: true,
        }),
        client_secret: this.configService.getOrThrow(
          'social.kakao.clientSecret',
          { infer: true },
        ),
        redirect_uri: redirectUri,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const tokenData: any = tokenRes.data;
    this.logger.log(`카카오 tokenData: ${JSON.stringify(tokenData)}`);
    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo: any = userRes.data;
    this.logger.log(`카카오 userInfo: ${JSON.stringify(userInfo)}`);
    return { email: userInfo.kakao_account?.email };
  }

  // 네이버 유저 정보 가져오기
  async getNaverUserInfo(code: string, state: string, redirectUri: string) {
    const tokenRes = await axios.post(
      'https://nid.naver.com/oauth2.0/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.configService.getOrThrow('social.naver.clientId', {
          infer: true,
        }),
        client_secret: this.configService.getOrThrow(
          'social.naver.clientSecret',
          { infer: true },
        ),
        code,
        state,
        redirect_uri: redirectUri,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const tokenData: any = tokenRes.data;
    this.logger.log(`네이버 tokenData: ${JSON.stringify(tokenData)}`);
    const userRes = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo: any = userRes.data;
    this.logger.log(`네이버 userInfo: ${JSON.stringify(userInfo)}`);
    return { email: userInfo.response?.email };
  }

  // 소셜 로그인 POST 콜백
  async handleSocialCallbackPost(
    {
      code,
      state,
      provider,
      redirectUri,
    }: { code: string; state?: string; provider: string; redirectUri?: string },
    req: Request,
    res: Response,
  ) {
    this.logger.log(`소셜 로그인 POST 콜백 처리 중: provider=${provider}`);
    if (!provider || !redirectUri) {
      throw new UnauthorizedException(
        'provider 또는 redirectUri가 누락되었습니다.',
      );
    }
    let userInfo: { email: string } | null = null;
    switch (provider) {
      case 'google':
        userInfo = await this.getGoogleUserInfo(code, redirectUri);
        break;
      case 'kakao':
        userInfo = await this.getKakaoUserInfo(code, redirectUri);
        break;
      case 'naver':
        if (!state) throw new UnauthorizedException('state가 누락되었습니다.');
        userInfo = await this.getNaverUserInfo(code, state, redirectUri);
        break;
      default:
        throw new UnauthorizedException('지원하지 않는 소셜 로그인입니다.');
    }
    if (!userInfo?.email)
      throw new UnauthorizedException('소셜 사용자 정보 획득 실패');
    const result = await this.processSocialLogin(
      { email: userInfo.email, authProvider: provider as AuthProvider },
      req,
      redirectUri,
    );
    res.cookie('accessToken', result.accessToken, result.accessOptions);
    if (result.refreshToken && result.refreshOptions) {
      res.cookie('refreshToken', result.refreshToken, result.refreshOptions);
    }
    return result;
  }

  private validateRedirectUri(redirectUri: string): boolean {
    const allowedUris =
      this.configService
        .get<string>('app.allowedRedirectUris', { infer: true })
        ?.split(',') || [];
    return allowedUris.some((uri) => redirectUri.startsWith(uri));
  }
}

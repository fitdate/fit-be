import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { Request, Response } from 'express';
import {
  AuthProvider,
  SocialTokenResponse,
  GoogleUserInfo,
  KakaoUserInfo,
  NaverUserInfo,
  SocialUserInfo,
  SocialLoginResponse,
} from '../types/oatuth.types';
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
import { CreateUserSocialDto } from '../../user/dto/create-user-social.dto';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class SocialAuthService {
  protected readonly logger = new Logger(SocialAuthService.name);

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly redisService: RedisService,
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
    this.logger.log(
      `소셜 로그인 처리 시작: ${userData.email}, provider: ${userData.authProvider}`,
    );

    if (redirectUri && !this.validateRedirectUri(redirectUri)) {
      throw new UnauthorizedException('Invalid redirect URI');
    }

    let user = await this.userService.findUserByEmail(userData.email);
    this.logger.log(
      `기존 유저 조회 결과: ${user ? '존재함' : '존재하지 않음'}`,
    );

    if (!user) {
      try {
        this.logger.log('신규 소셜 유저 생성 시작');
        user = await this.userService.createSocialUser({
          email: userData.email,
          authProvider: userData.authProvider,
          isProfileComplete: false,
          password: null,
        });
        this.logger.log(`신규 소셜 유저 생성 완료: ${user.id}`);
      } catch (error) {
        this.logger.error('소셜 유저 생성 실패:', error);
        throw new UnauthorizedException(
          '소셜 로그인 사용자 생성에 실패했습니다.',
          { cause: error },
        );
      }
    }

    // 로그인 처리
    this.logger.log('로그인 처리 시작');
    const sessionId = uuidv4();
    const tokenId = uuidv4();

    const userAgentStr = req.headers['user-agent'] || 'unknown';
    const metadata: TokenMetadata = {
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: userAgentStr,
      sessionId,
    };

    await this.sessionService.createSession(user.id, tokenId, metadata);
    this.logger.log(`세션 생성 완료: ${sessionId}`);

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
    this.logger.log('토큰 생성 완료');

    return {
      ...tokenResponse,
      isProfileComplete: user.isProfileComplete || false,
      redirectUrl: redirectUri || '/',
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
  async getGoogleUserInfo(
    code: string,
    redirectUri: string,
  ): Promise<{ email: string }> {
    const tokenRes = await axios.post<SocialTokenResponse>(
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
    const tokenData = tokenRes.data;
    this.logger.log(`구글 tokenData: ${JSON.stringify(tokenData)}`);

    const userRes = await axios.get<GoogleUserInfo>(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    const userInfo = userRes.data;
    this.logger.log(`구글 userInfo: ${JSON.stringify(userInfo)}`);
    return { email: userInfo.email };
  }

  // 카카오 유저 정보 가져오기
  async getKakaoUserInfo(
    code: string,
    redirectUri: string,
  ): Promise<{ email: string }> {
    const tokenRes = await axios.post<SocialTokenResponse>(
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
    const tokenData = tokenRes.data;
    this.logger.log(`카카오 tokenData: ${JSON.stringify(tokenData)}`);

    const userRes = await axios.get<KakaoUserInfo>(
      'https://kapi.kakao.com/v2/user/me',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    const userInfo = userRes.data;
    this.logger.log(`카카오 userInfo: ${JSON.stringify(userInfo)}`);
    return { email: userInfo.kakao_account.email };
  }

  // 네이버 유저 정보 가져오기
  async getNaverUserInfo(
    code: string,
    redirectUri: string,
  ): Promise<{ email: string }> {
    const tokenRes = await axios.post<SocialTokenResponse>(
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
        redirect_uri: redirectUri,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const tokenData = tokenRes.data;
    this.logger.log(`네이버 tokenData: ${JSON.stringify(tokenData)}`);

    const userRes = await axios.get<NaverUserInfo>(
      'https://openapi.naver.com/v1/nid/me',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    const userInfo = userRes.data;
    this.logger.log(`네이버 userInfo: ${JSON.stringify(userInfo)}`);
    return { email: userInfo.response.email };
  }

  // 소셜 로그인 POST 콜백
  async handleSocialCallbackPost(
    data: {
      code: string;
      provider: AuthProvider;
      redirectUri: string;
      state?: string;
    },
    req: Request,
    res: Response,
  ): Promise<SocialLoginResponse> {
    this.logger.log(`소셜 로그인 처리 시작: ${data.provider}`);

    // 소셜 로그인 토큰 및 사용자 정보 가져오기
    const userInfo = await this.getSocialUserInfo(data);
    this.logger.log(`소셜 사용자 정보: ${JSON.stringify(userInfo)}`);

    // 기존 유저 확인
    const existingUser = await this.userService.findUserByEmail(userInfo.email);

    if (existingUser) {
      this.logger.log(`기존 유저 발견: ${existingUser.id}`);

      // 프로필 완성 여부에 따라 리다이렉트 URL 결정
      const redirectUrl = existingUser.isProfileComplete
        ? `https://www.fit-date.co.kr/home`
        : `https://www.fit-date.co.kr/social-signup`;

      // 새로운 세션 및 토큰 생성
      const sessionId = uuidv4();
      const tokenId = uuidv4();
      const metadata: TokenMetadata = {
        ip: req.ip || req.socket?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        sessionId,
      };

      // 기존 세션 및 토큰 삭제
      await this.sessionService.deleteSession(existingUser.id);
      await this.sessionService.deleteActiveSession(existingUser.id);
      this.logger.log(`기존 세션 및 토큰 삭제 완료: ${existingUser.id}`);

      // 새 세션 생성
      await this.sessionService.createSession(
        existingUser.id,
        tokenId,
        metadata,
      );
      await this.sessionService.updateActiveSession(existingUser.id);
      this.logger.log(`새 세션 생성 완료: ${sessionId}`);

      // 토큰 생성
      const tokenPayload: TokenPayload = {
        sub: existingUser.id,
        role: existingUser.role,
        type: 'access',
        tokenId,
        sessionId,
      };

      const tokens = await this.tokenService.generateAndSetTokens(
        existingUser.id,
        tokenPayload,
        data.redirectUri,
      );

      // 쿠키 설정
      res.cookie('accessToken', tokens.accessToken, {
        ...tokens.accessOptions,
        domain: '.fit-date.co.kr',
      });
      if (tokens.refreshToken && tokens.refreshOptions) {
        res.cookie('refreshToken', tokens.refreshToken, {
          ...tokens.refreshOptions,
          domain: '.fit-date.co.kr',
        });
      }
      this.logger.log(`토큰 쿠키 설정 완료`);

      return {
        redirectUrl,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          authProvider: existingUser.authProvider,
          isProfileComplete: existingUser.isProfileComplete,
        },
      };
    } else {
      this.logger.log('신규 유저 생성');

      // 신규 유저 생성
      const createUserDto: CreateUserSocialDto = {
        email: userInfo.email,
        authProvider: data.provider,
        isProfileComplete: false,
      };

      const newUser = await this.userService.createSocialUser(createUserDto);
      this.logger.log(`신규 유저 생성 완료: ${newUser.id}`);

      return {
        redirectUrl: `https://www.fit-date.co.kr/social-signup`,
        user: {
          id: newUser.id,
          email: newUser.email,
          authProvider: newUser.authProvider,
          isProfileComplete: false,
        },
      };
    }
  }

  private validateRedirectUri(redirectUri: string): boolean {
    const allowedUris =
      this.configService
        .get<string>('app.allowedRedirectUris', { infer: true })
        ?.split(',') || [];
    return allowedUris.some((uri) => redirectUri.startsWith(uri));
  }

  // 소셜 로그인 유저 상태 확인
  async checkSocialUserStatus(
    email: string,
    provider: AuthProvider,
  ): Promise<{
    exists: boolean;
    isProfileComplete: boolean;
    userId?: string;
    authProvider?: string;
  }> {
    this.logger.log(
      `소셜 유저 상태 확인 시작: ${email}, provider: ${provider}`,
    );
    const user = await this.userService.findUserByEmail(email);
    this.logger.log(`유저 조회 결과: ${user ? '존재함' : '존재하지 않음'}`);

    if (!user) {
      return {
        exists: false,
        isProfileComplete: false,
      };
    }

    return {
      exists: true,
      isProfileComplete: user.isProfileComplete || false,
      userId: user.id,
      authProvider: user.authProvider,
    };
  }

  private async getSocialUserInfo(data: {
    code: string;
    provider: AuthProvider;
    redirectUri: string;
    state?: string;
  }): Promise<{ email: string }> {
    switch (data.provider) {
      case AuthProvider.GOOGLE:
        return this.getGoogleUserInfo(data.code, data.redirectUri);
      case AuthProvider.KAKAO:
        return this.getKakaoUserInfo(data.code, data.redirectUri);
      case AuthProvider.NAVER:
        return this.getNaverUserInfo(data.code, data.redirectUri);
      default:
        throw new UnauthorizedException('지원하지 않는 소셜 로그인입니다.');
    }
  }
}

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { HashService } from './hash/hash.service';
import { JwtService } from '@nestjs/jwt';
import { AllConfig } from 'src/common/config/config.types';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/common/enum/user-role.enum';
import { RegisterDto } from './dto/register.dto';
import { TokenPayload } from './types/token-payload.types';
import { EmailLoginDto } from './dto/email-login.dto';
import { MailerService } from '../mailer/mailer.service';
import { RedisService } from '../redis/redis.service';
import { parseTimeToSeconds } from 'src/common/util/time.util';
import { AuthProvider } from './types/oatuth.types';
import { SendVerificationEmailDto } from './dto/send-verification-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { CookieOptions, Response, Request } from 'express';
import { User } from '../user/entities/user.entity';
import { LocationService } from 'src/modules/location/location.service';
import { SocialUserInfo } from './types/oatuth.types';
import { JwtTokenResponse, LoginResponse } from './types/auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly hashService: HashService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly redisService: RedisService,
    private readonly locationService: LocationService,
  ) {}

  parseBasicToken(rawToken: string) {
    const basicToken = rawToken.split(' ')[1];
    if (basicToken.length !== 2) {
      throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
    }

    const [basic, token] = basicToken;

    if (basic.toLocaleLowerCase() !== 'basic') {
      throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
    }

    const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
    const tokenSplit = decodedToken.split(':');

    if (tokenSplit.length !== 2) {
      throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
    }

    const [email, password] = tokenSplit;

    return { email, password };
  }

  async parseBearerToken(
    rawToken: string,
    isRefreshToken: boolean,
  ): Promise<TokenPayload> {
    const bearerToken = rawToken.split(' ')[1];
    if (!bearerToken) {
      throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
    }

    const [bearer, token] = bearerToken.split(' ');

    if (bearer.toLocaleLowerCase() !== 'bearer') {
      throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.configService.getOrThrow(
          isRefreshToken ? 'jwt.refreshTokenSecret' : 'jwt.accessTokenSecret',
          {
            infer: true,
          },
        ),
      });
      if (isRefreshToken && payload.type !== 'refresh') {
        throw new UnauthorizedException('리프레시 토큰이 아닙니다.');
      }

      if (!isRefreshToken && payload.type !== 'access') {
        throw new UnauthorizedException('엑세스 토큰이 아닙니다.');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('토큰이 만료되었거나 잘못되었습니다.', {
        cause: error,
      });
    }
  }

  async register(registerDto: RegisterDto) {
    this.logger.log(
      `Attempting to register user with email: ${registerDto.email}`,
    );
    const {
      email,
      password,
      nickname,
      name,
      birthday,
      gender,
      phone,
      region,
      role,
    } = registerDto;

    // const isEmailVerified = await this.checkEmailVerification(email);
    // if (!isEmailVerified) {
    //   throw new UnauthorizedException(
    //     '이메일 인증이 완료되지 않았습니다. 인증 후 회원가입이 가능합니다.',
    //   );
    // }

    const userEmail = await this.userService.findUserByEmail(email);
    if (userEmail) {
      throw new UnauthorizedException('이미 존재하는 이메일입니다.');
    }

    const userNickname = await this.userService.findUserByNickname(nickname);
    if (userNickname) {
      throw new UnauthorizedException('이미 존재하는 닉네임입니다.');
    }

    if (!nickname) {
      throw new UnauthorizedException('닉네임을 입력해주세요.');
    }

    if (!birthday) {
      throw new UnauthorizedException('생년월일을 입력해주세요.');
    }

    if (!gender) {
      throw new UnauthorizedException('성별을 입력해주세요.');
    }

    if (!region) {
      throw new UnauthorizedException('지역을 입력해주세요.');
    }

    if (!phone) {
      throw new UnauthorizedException('전화번호를 입력해주세요.');
    }

    const userRegion = this.locationService.getRegionByRegionKey(region);
    const userAuthProvider = AuthProvider.EMAIL;

    const hashedPassword = await this.hashService.hash(password);
    const user = await this.userService.createUser({
      email,
      password: hashedPassword,
      nickname,
      name,
      birthday,
      gender,
      phone,
      region: userRegion,
      role,
      isProfileComplete: true,
      authProvider: userAuthProvider,
    });

    // 인증 완료 후 Redis에서 인증 상태 삭제
    // const verifiedKey = `email-verified:${email}`;
    // await this.redisService.del(verifiedKey);

    this.logger.log(
      `Successfully registered user with email: ${registerDto.email}`,
    );
    return user;
  }

  //일단 임시로 이메일 중복확인
  async checkEmail(email: string) {
    const user = await this.userService.findUserByEmail(email);
    if (user) {
      throw new UnauthorizedException('이미 존재하는 이메일입니다.');
    }
  }

  async validate(email: string, password: string) {
    this.logger.log(`Validating user with email: ${email}`);
    const user = await this.userService.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    const isPasswordValid = await this.hashService.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    this.logger.log(`Successfully validated user with email: ${email}`);
    return user;
  }

  async login(
    loginDto: EmailLoginDto,
    origin?: string,
  ): Promise<JwtTokenResponse> {
    this.logger.log(`Attempting login for user with email: ${loginDto.email}`);
    const { email, password } = loginDto;
    const user = await this.validate(email, password);
    const tokens = this.generateTokens(user.id, user.role, origin);
    this.logger.log(
      `Successfully logged in user with email: ${loginDto.email}`,
    );
    return this.generateTokens(user.id, user.role, origin);
  }

  //이메일 로그인
  async handleEmailLogin(
    loginDto: EmailLoginDto,
    req: Request,
    res: Response,
  ): Promise<LoginResponse> {
    const { email, password } = loginDto;
    const user = await this.validate(email, password);
    const tokens = this.generateTokens(user.id, user.role, req.headers.origin);
    res.cookie('accessToken', tokens.accessToken, tokens.accessOptions);
    res.cookie('refreshToken', tokens.refreshToken, tokens.refreshOptions);

    return {
      message: '로그인 성공',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  //로그아웃
  handleLogout(req: Request, res: Response) {
    const cookieOptions = this.logoutCookieOptions(req.headers.origin);

    // 쿠키 만료 설정
    res.cookie('accessToken', '', cookieOptions.accessOptions);
    res.cookie('refreshToken', '', cookieOptions.refreshOptions);

    // Redis에서 리프레시 토큰 삭제도 구현 가능 (보류)

    return {
      message: '로그아웃 성공',
    };
  }

  //구글 콜백 처리
  async handleGoogleCallback(
    user: { email: string; name?: string },
    req: Request,
    res: Response,
  ): Promise<string> {
    this.logger.log(`Processing Google callback for user: ${user.email}`);
    try {
      const socialUserInfo: SocialUserInfo = {
        email: user.email,
        name: user.name,
        authProvider: AuthProvider.GOOGLE,
      };

      const result = await this.googleLogin(socialUserInfo, req.headers.origin);

      res.cookie('accessToken', result.accessToken, result.accessOptions);
      res.cookie('refreshToken', result.refreshToken, result.refreshOptions);

      // 프론트엔드 URL 및 리다이렉트 경로 설정
      const frontendUrl =
        this.configService.get('social.socialFrontendUrl', { infer: true }) ||
        this.configService.get('app.host', { infer: true });

      // 리다이렉트 URL 구성
      this.logger.log(
        `Successfully processed Google callback for user: ${user.email}`,
      );
      return `${frontendUrl}${result.redirectUrl}`;
    } catch (error) {
      this.logger.error(
        `Failed to process Google callback for user: ${user.email}`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.stack,
      );
      throw new UnauthorizedException(
        '구글 로그인 처리 중 오류가 발생했습니다.',
        { cause: error },
      );
    }
  }

  async handleKakaoCallback(
    user: { email: string; name?: string },
    req: Request,
    res: Response,
  ): Promise<string> {
    this.logger.log(`Processing Kakao callback for user: ${user.email}`);
    try {
      const socialUserInfo: SocialUserInfo = {
        email: user.email,
        name: user.name,
        authProvider: AuthProvider.KAKAO,
      };
      const result = await this.kakaoLogin(socialUserInfo, req.headers.origin);

      res.cookie('accessToken', result.accessToken, result.accessOptions);
      res.cookie('refreshToken', result.refreshToken, result.refreshOptions);

      const frontendUrl =
        this.configService.get('social.socialFrontendUrl', { infer: true }) ||
        this.configService.get('app.host', { infer: true });

      this.logger.log(
        `Successfully processed Kakao callback for user: ${user.email}`,
      );
      return `${frontendUrl}${result.redirectUrl}`;
    } catch (error) {
      this.logger.error(
        `Failed to process Kakao callback for user: ${user.email}`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.stack,
      );
      throw new UnauthorizedException(
        '카카오 로그인 처리 중 오류가 발생했습니다.',
        { cause: error },
      );
    }
  }

  async handleNaverCallback(
    user: { email: string; name?: string },
    req: Request,
    res: Response,
  ): Promise<string> {
    this.logger.log(`Processing Naver callback for user: ${user.email}`);
    try {
      const socialUserInfo: SocialUserInfo = {
        email: user.email,
        name: user.name,
        authProvider: AuthProvider.NAVER,
      };
      const result = await this.naverLogin(socialUserInfo, req.headers.origin);

      res.cookie('accessToken', result.accessToken, result.accessOptions);
      res.cookie('refreshToken', result.refreshToken, result.refreshOptions);

      const frontendUrl =
        this.configService.get('social.socialFrontendUrl', { infer: true }) ||
        this.configService.get('app.host', { infer: true });

      this.logger.log(
        `Successfully processed Naver callback for user: ${user.email}`,
      );
      return `${frontendUrl}${result.redirectUrl}`;
    } catch (error) {
      this.logger.error(
        `Failed to process Naver callback for user: ${user.email}`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.stack,
      );
      throw new UnauthorizedException(
        '네이버 로그인 처리 중 오류가 발생했습니다.',
        { cause: error },
      );
    }
  }
  // 토큰 생성
  generateTokens(
    userId: string,
    userRole: UserRole,
    origin?: string,
  ): JwtTokenResponse {
    const accessToken = this.issueToken(userId, userRole, false);
    const refreshToken = this.issueToken(userId, userRole, true);

    const accessTokenTtl =
      this.configService.get('jwt.accessTokenTtl', { infer: true }) || '30m';
    const refreshTokenTtl =
      this.configService.get('jwt.refreshTokenTtl', { infer: true }) || '7d';

    const accessTokenMaxAge = parseTimeToSeconds(accessTokenTtl) * 1000;
    const refreshTokenMaxAge = parseTimeToSeconds(refreshTokenTtl) * 1000;

    return {
      accessToken,
      refreshToken,
      accessOptions: this.createCookieOptions(accessTokenMaxAge, origin),
      refreshOptions: this.createCookieOptions(refreshTokenMaxAge, origin),
    };
  }

  //쿠키
  createCookieOptions(maxAge: number, origin?: string): CookieOptions {
    let domain: string | undefined;

    const configDomain = this.configService.get('app.host', {
      infer: true,
    });
    if (configDomain) {
      domain = configDomain;
    } else if (origin) {
      // 환경 변수에 설정이 없는 경우 origin에서 도메인 추출
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
      sameSite: 'lax',
      maxAge,
      domain: '.fit-date.co.kr', //배포할때 삭제하기,
      path: '/',
    };
  }

  //로그아웃
  logoutCookieOptions(origin?: string): {
    accessOptions: CookieOptions;
    refreshOptions: CookieOptions;
  } {
    return {
      accessOptions: this.createCookieOptions(0, origin),
      refreshOptions: this.createCookieOptions(0, origin),
    };
  }

  issueToken(userId: string, userRole: UserRole, isRefreshToken: boolean) {
    const accessTokenSecret = this.configService.getOrThrow(
      'jwt.accessTokenSecret',
      {
        infer: true,
      },
    );

    const refreshTokenSecret = this.configService.getOrThrow(
      'jwt.refreshTokenSecret',
      {
        infer: true,
      },
    );

    const accessTokenExpiresIn = this.configService.getOrThrow(
      'jwt.accessTokenTtl',
      {
        infer: true,
      },
    );

    const refreshTokenExpiresIn = this.configService.getOrThrow(
      'jwt.refreshTokenTtl',
      {
        infer: true,
      },
    );

    const tokenType = isRefreshToken ? 'refresh' : 'access';

    const audience = this.configService.getOrThrow('jwt.audience', {
      infer: true,
    });

    const issuer = this.configService.getOrThrow('jwt.issuer', {
      infer: true,
    });

    const tokenSecret = isRefreshToken ? refreshTokenSecret : accessTokenSecret;

    const tokenTtl = isRefreshToken
      ? refreshTokenExpiresIn
      : accessTokenExpiresIn;

    const token = this.jwtService.sign(
      {
        sub: userId,
        role: userRole,
        type: tokenType,
      },
      {
        secret: tokenSecret,
        expiresIn: tokenTtl,
        audience,
        issuer,
      },
    );
    return token;
  }

  async sendVerificationEmail(
    sendVerificationEmailDto: SendVerificationEmailDto,
  ): Promise<{ success: boolean }> {
    this.logger.log(
      `Sending verification email to: ${sendVerificationEmailDto.email}`,
    );
    const { email } = sendVerificationEmailDto;
    const user = await this.userService.findUserByEmail(email);
    if (user) {
      throw new UnauthorizedException('이미 존재하는 이메일입니다.');
    }
    // 6자리 인증 코드 생성
    const verificationCode = this.mailerService.generateEmailVerificationCode();

    // Redis에 코드를 키로, 이메일을 값으로 저장 (역방향 매핑)
    const codeKey = `verification-code:${verificationCode}`;

    // 시간 문자열을 초 단위로 변환
    const tokenTtlStr = this.configService.getOrThrow(
      'mailer.MAILER_TOKEN_TTL',
      {
        infer: true,
      },
    );
    const tokenTtlSeconds = parseTimeToSeconds(tokenTtlStr);

    // 코드를 키로 이메일을 저장
    await this.redisService.set(codeKey, email, tokenTtlSeconds);

    // 생성한 인증 코드를 전달하여 이메일 발송
    await this.mailerService.sendEmailVerification(email, verificationCode);
    this.logger.log(
      `Successfully sent verification email to: ${sendVerificationEmailDto.email}`,
    );
    return { success: true };
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ verified: boolean; email: string }> {
    this.logger.log(`Verifying email with code: ${verifyEmailDto.code}`);
    const { code } = verifyEmailDto;
    try {
      // Redis에서 코드로 이메일 찾기
      const codeKey = `verification-code:${code}`;
      const email = await this.redisService.get(codeKey);

      if (!email) {
        throw new UnauthorizedException(
          '유효하지 않거나 만료된 인증 코드입니다.',
        );
      }

      // 인증 완료 상태 저장
      const verifiedKey = `email-verified:${email}`;
      const verifiedTtlSeconds = 60 * 60; // 1시간
      await this.redisService.set(verifiedKey, 'verified', verifiedTtlSeconds);

      // 인증 코드 삭제
      await this.redisService.del(codeKey);

      this.logger.log(`Successfully verified email: ${email}`);
      return {
        verified: true,
        email,
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify email with code: ${verifyEmailDto.code}`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.stack,
      );
      throw new UnauthorizedException(
        '인증에 실패했습니다. 유효하지 않거나 만료된 인증 코드입니다.',
        {
          cause: error,
        },
      );
    }
  }

  async checkEmailVerification(email: string): Promise<boolean> {
    const verifiedKey = `email-verified:${email}`;
    const verifiedValue = await this.redisService.get(verifiedKey);
    return verifiedValue === 'verified';
  }

  // 소셜 로그인
  async processSocialLogin(
    userData: SocialUserInfo,
    origin?: string,
  ): Promise<
    JwtTokenResponse & {
      isProfileComplete: boolean;
      redirectUrl: string;
    }
  > {
    let user: User | null = await this.userService.findUserByEmail(
      userData.email,
    );

    if (!user) {
      try {
        const newUser = await this.userService.createSocialUser({
          email: userData.email,
          name: userData.name,
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

    const tokenResponse = this.generateTokens(user.id, user.role, origin);

    // 프로필 완성 여부 확인
    const isProfileComplete = user.isProfileComplete || false;

    // 리다이렉트 경로 결정
    const redirectPath = isProfileComplete ? '/' : '/complete-profile';

    return {
      ...tokenResponse,
      isProfileComplete,
      redirectUrl: redirectPath,
    };
  }

  // 구글 로그인
  async googleLogin(userData: SocialUserInfo, origin?: string) {
    return this.processSocialLogin(
      {
        ...userData,
        authProvider: AuthProvider.GOOGLE,
      },
      origin,
    );
  }

  async kakaoLogin(userData: SocialUserInfo, origin?: string) {
    return this.processSocialLogin(
      {
        ...userData,
        authProvider: AuthProvider.KAKAO,
      },
      origin,
    );
  }

  async naverLogin(userData: SocialUserInfo, origin?: string) {
    return this.processSocialLogin(
      {
        ...userData,
        authProvider: AuthProvider.NAVER,
      },
      origin,
    );
  }
}

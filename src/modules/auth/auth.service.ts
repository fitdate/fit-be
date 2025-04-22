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
import { ProfileService } from '../profile/profile.service';
import { Profile } from '../profile/entities/profile.entity';
import { DataSource } from 'typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { Mbti } from '../profile/mbti/entities/mbti.entity';
import { UserIntroduction } from '../profile/introduction/entities/user-introduction.entity';
import { UserFeedback } from '../profile/feedback/entities/user-feedback.entity';
import { UserInterestCategory } from '../profile/interest-category/entities/user-interest-category.entity';
import { ProfileImage } from '../profile/profile-image/entities/profile-image.entity';

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
    private readonly profileService: ProfileService,
    private readonly dataSource: DataSource,
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
    const [bearer, token] = rawToken.split(' ');

    if (!bearer || !token) {
      throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
    }

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

  async emailTempRegister(email: string) {
    // 인증 완료 후 Redis에서 인증 상태 삭제
    const verifiedKey = `email-verified:${email}`;
    await this.redisService.del(verifiedKey);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const user = await qr.manager.save(User, {
        email,
        role: UserRole.TEMP_USER,
        authProvider: AuthProvider.EMAIL,
      });

      const profile = await qr.manager.save(Profile, {
        user: { id: user.id },
      });

      await qr.commitTransaction();
      return { user, profile };
    } catch (error) {
      await qr.rollbackTransaction();
      this.logger.error(
        `Failed to create temp user for email: ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        '기본 유저 생성 중 오류가 발생했습니다.',
        { cause: error },
      );
    } finally {
      await qr.release();
    }
  }

  async register(registerDto: RegisterDto) {
    this.logger.log(
      `Attempting to register user with email: ${registerDto.email}`,
    );

    const isEmailVerified = await this.checkEmailVerification(
      registerDto.email,
    );

    const tempUser = await this.userService.findUserByEmail(registerDto.email);

    if (!tempUser) {
      throw new UnauthorizedException('인증이 완료되지 않은 이메일입니다.');
    }

    if (!isEmailVerified) {
      throw new UnauthorizedException(
        '이메일 인증이 완료되지 않았습니다. 인증 후 회원가입이 가능합니다.',
      );
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const hashedPassword = await this.hashService.hash(registerDto.password);
      tempUser.password = hashedPassword;
      tempUser.nickname = registerDto.nickname;
      tempUser.name = registerDto.name;
      tempUser.birthday = registerDto.birthday;
      tempUser.gender = registerDto.gender;
      tempUser.phone = registerDto.phone;
      tempUser.region = registerDto.region;
      tempUser.role = UserRole.USER;
      tempUser.isProfileComplete = false;
      tempUser.authProvider = AuthProvider.EMAIL;

      const user = await qr.manager.save(User, tempUser);

      tempUser.profile.intro = registerDto.intro ?? '';
      tempUser.profile.job = registerDto.job ?? '';

      await qr.manager.save(Profile, tempUser.profile);

      await qr.manager.save(Mbti, {
        profile: { id: tempUser.profile.id },
        mbti: registerDto.mbti?.mbti,
      });

      await qr.manager.save(UserFeedback, {
        profile: { id: tempUser.profile.id },
        feedbackIds: registerDto.feedback?.feedbackIds,
      });

      await qr.manager.save(UserIntroduction, {
        profile: { id: tempUser.profile.id },
        introductionIds: registerDto.introduction?.introductionIds,
      });

      await qr.manager.save(UserInterestCategory, {
        profile: { id: tempUser.profile.id },
        interestCategoryIds: registerDto.interestCategory?.interestCategoryIds,
      });

      await qr.manager.save(ProfileImage, {
        profile: { id: tempUser.profile.id },
        imageIds: registerDto.profileImageUrls,
      });

      await qr.commitTransaction();

      return { user, profile: tempUser.profile };
    } catch (error) {
      await qr.rollbackTransaction();
      throw new InternalServerErrorException(
        '회원가입 중 오류가 발생했습니다.',
        { cause: error },
      );
    } finally {
      await qr.release();
    }
  }

  async checkNickname(nickname: string) {
    const user = await this.userService.findUserByNickname(nickname);
    if (user) {
      throw new UnauthorizedException('이미 존재하는 닉네임입니다.');
    }
  }

  async checkEmail(sendVerificationEmailDto: SendVerificationEmailDto) {
    console.log(sendVerificationEmailDto);
    this.logger.log(
      `Attempting to check email: ${sendVerificationEmailDto.email}`,
    );
    const user = await this.userService.findUserByEmail(
      sendVerificationEmailDto.email,
    );
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

    const userData = await this.userService.findOne(user.id);
    if (!userData) {
      throw new UnauthorizedException('User not found');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: userPassword, ...userDataWithoutPassword } = userData;

    return {
      message: '로그인 성공',
      user: userDataWithoutPassword,
    };
  }

  //로그아웃
  handleLogout(req: Request, res: Response) {
    try {
      const cookieOptions = this.logoutCookieOptions(req.headers.origin);

      // 쿠키 만료 설정
      res.cookie('accessToken', '', cookieOptions.accessOptions);
      res.cookie('refreshToken', '', cookieOptions.refreshOptions);

      return {
        message: '로그아웃 성공',
      };
    } catch (error) {
      this.logger.error('Logout failed', error);
      throw new UnauthorizedException('로그아웃에 실패했습니다.');
    }
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
    console.log(sendVerificationEmailDto);
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
    const tokenTtlStr = this.configService.getOrThrow('mailer.tokenTtl', {
      infer: true,
    });
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

      // 임시 유저 생성
      await this.emailTempRegister(email);

      this.logger.log(`Successfully verified email: ${email}`);

      return {
        verified: true,
        email,
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify email with code: ${verifyEmailDto.code}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new UnauthorizedException(
        '인증에 실패했습니다. 유효하지 않거나 만료된 인증 코드입니다.',
        { cause: error },
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

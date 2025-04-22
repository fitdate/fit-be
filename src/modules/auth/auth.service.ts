import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { HashService } from './hash/hash.service';
import { JwtService } from '@nestjs/jwt';
import { AllConfig } from 'src/common/config/config.types';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/common/enum/user-role.enum';
import { RegisterDto } from './dto/register.dto';
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
import { ProfileImageService } from '../profile/profile-image/profile-image.service';
import { S3Service } from '../s3/s3.service';

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
    private readonly s3Service: S3Service,
    private readonly profileImageService: ProfileImageService,
  ) {}
  private async processImagesInChunks(
    images: string[],
    profileId: string,
    log: (message: string) => void,
  ) {
    const CHUNK_SIZE = 3; // 동시에 처리할 이미지 수
    const results: Array<{
      profile: { id: string };
      url: string;
      key: string;
      isMain: boolean;
    } | null> = [];

    for (let i = 0; i < images.length; i += CHUNK_SIZE) {
      const chunk = images.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (url, index) => {
          try {
            log(`Processing image ${i + index + 1}: ${url}`);
            if (!url) {
              log(`Skipping null/undefined URL at index ${i + index}`);
              return null;
            }

            const key = this.s3Service.extractKeyFromUrl(url);
            const moved = await this.profileImageService.moveTempToProfileImage(
              profileId,
              key,
            );

            return {
              profile: { id: profileId },
              url: moved.url,
              key: moved.key,
              isMain: i + index === 0,
            };
          } catch (err) {
            log(
              `Failed to process image ${i + index + 1}: ${
                err instanceof Error ? err.message : err
              }`,
            );
            return null;
          }
        }),
      );
      results.push(...chunkResults);
    }

    return results.filter(
      (img): img is NonNullable<typeof img> => img !== null,
    );
  }

  async register(registerDto: RegisterDto) {
    const logBuffer: string[] = [];
    const errorBuffer: Error[] = [];
    const log = (message: string) => {
      logBuffer.push(message);
      this.logger.log(message);
    };

    log(`Attempting to register new user with email: ${registerDto.email}`);

    // 이메일 인증 여부 확인
    const isEmailVerified = await this.checkEmailVerification(
      registerDto.email,
    );
    if (!isEmailVerified) {
      throw new UnauthorizedException('이메일 인증이 필요합니다.');
    }

    // 기존 유저 확인
    const existingUser = await this.userService.findUserByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new UnauthorizedException('이미 존재하는 이메일입니다.');
    }

    // 비밀번호 확인
    if (registerDto.password !== registerDto.confirmPassword) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    // 각 단계별로 별도의 트랜잭션 실행
    try {
      // 1. 프로필 생성
      const profileQr = this.dataSource.createQueryRunner();
      await profileQr.connect();
      await profileQr.startTransaction();
      log('Starting profile creation transaction');

      let profile: Profile;
      try {
        profile = await profileQr.manager.save<Profile>(new Profile());
        log(`Profile created successfully with ID: ${profile.id}`);
        await profileQr.commitTransaction();
      } catch (error) {
        await profileQr.rollbackTransaction();
        throw error;
      } finally {
        await profileQr.release();
      }

      // 2. 유저 생성
      const userQr = this.dataSource.createQueryRunner();
      await userQr.connect();
      await userQr.startTransaction();
      log('Starting user creation transaction');

      let user: User;
      try {
        user = await userQr.manager.save(User, {
          email: registerDto.email,
          password: registerDto.password,
          nickname: registerDto.nickname,
          name: registerDto.name,
          birthday: registerDto.birthday,
          gender: registerDto.gender,
          region: registerDto.region,
          phone: registerDto.phone,
          role: UserRole.USER,
          isProfileComplete: false,
          authProvider: AuthProvider.EMAIL,
          job: registerDto.job,
          profile: { id: profile.id },
        });
        log(`User created successfully with ID: ${user.id}`);
        await userQr.commitTransaction();
      } catch (error) {
        await userQr.rollbackTransaction();
        throw error;
      } finally {
        await userQr.release();
      }

      // 3. 프로필 이미지 저장
      if (registerDto.images?.length) {
        const imageQr = this.dataSource.createQueryRunner();
        await imageQr.connect();
        await imageQr.startTransaction();
        log(`Starting profile image save transaction for: ${user.id}`);

        try {
          const profileImages = await this.processImagesInChunks(
            registerDto.images,
            profile.id,
            log,
          );

          if (profileImages.length > 0) {
            await imageQr.manager.save(ProfileImage, profileImages);
            log(`Profile images saved successfully for user: ${user.id}`);
          }
          await imageQr.commitTransaction();
        } catch (error) {
          await imageQr.rollbackTransaction();
          errorBuffer.push(
            new Error(
              `Profile image save failed: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
            ),
          );
          log(
            `Profile image save failed: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
          );
        } finally {
          await imageQr.release();
        }
      }

      // 4. MBTI 저장
      if (registerDto.mbti?.[0]) {
        const mbtiQr = this.dataSource.createQueryRunner();
        await mbtiQr.connect();
        await mbtiQr.startTransaction();
        log(`Starting MBTI save transaction for: ${user.id}`);

        try {
          await mbtiQr.manager.save(Mbti, {
            mbti: registerDto.mbti[0],
            profile: { id: profile.id },
          });
          log(`MBTI saved successfully for user: ${user.id}`);
          await mbtiQr.commitTransaction();
        } catch (error) {
          await mbtiQr.rollbackTransaction();
          errorBuffer.push(
            new Error(
              `MBTI save failed: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
            ),
          );
          log(
            `MBTI save failed: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
          );
        } finally {
          await mbtiQr.release();
        }
      }

      // 5. 피드백 저장
      if (registerDto.selfintro?.length) {
        const feedbackQr = this.dataSource.createQueryRunner();
        await feedbackQr.connect();
        await feedbackQr.startTransaction();
        log(`Starting feedback save transaction for: ${user.id}`);

        try {
          const feedbacks = registerDto.selfintro.map((feedback) => ({
            profile: { id: profile.id },
            feedbackId: feedback,
          }));
          await feedbackQr.manager.save(UserFeedback, feedbacks);
          log(`User feedback saved successfully for user: ${user.id}`);
          await feedbackQr.commitTransaction();
        } catch (error) {
          await feedbackQr.rollbackTransaction();
          errorBuffer.push(
            new Error(
              `Feedback save failed: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
            ),
          );
          log(
            `Feedback save failed: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
          );
        } finally {
          await feedbackQr.release();
        }
      }

      // 6. 자기소개 저장
      if (registerDto.listening?.length) {
        const introQr = this.dataSource.createQueryRunner();
        await introQr.connect();
        await introQr.startTransaction();
        log(`Starting introduction save transaction for: ${user.id}`);

        try {
          const introductions = registerDto.listening.map((intro) => ({
            profile: { id: profile.id },
            introductionId: intro,
          }));
          await introQr.manager.save(UserIntroduction, introductions);
          log(`User introduction saved successfully for user: ${user.id}`);
          await introQr.commitTransaction();
        } catch (error) {
          await introQr.rollbackTransaction();
          errorBuffer.push(
            new Error(
              `Introduction save failed: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
            ),
          );
          log(
            `Introduction save failed: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
          );
        } finally {
          await introQr.release();
        }
      }

      // 7. 관심사 저장
      if (registerDto.interests?.length) {
        const interestQr = this.dataSource.createQueryRunner();
        await interestQr.connect();
        await interestQr.startTransaction();
        log(`Starting interests save transaction for: ${user.id}`);

        try {
          const interests = registerDto.interests.map((interest) => ({
            profile: { id: profile.id },
            interestCategoryId: interest,
          }));
          await interestQr.manager.save(UserInterestCategory, interests);
          log(`User interests saved successfully for user: ${user.id}`);
          await interestQr.commitTransaction();
        } catch (error) {
          await interestQr.rollbackTransaction();
          errorBuffer.push(
            new Error(
              `Interests save failed: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
            ),
          );
          log(
            `Interests save failed: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
          );
        } finally {
          await interestQr.release();
        }
      }

      // 모든 에러 수집 및 로깅
      if (errorBuffer.length > 0) {
        log('Summary of errors:');
        errorBuffer.forEach((error, index) => {
          log(`[${index + 1}] ${error.message}`);
        });
        throw new InternalServerErrorException(
          '회원가입 중 일부 오류가 발생했습니다.',
          { cause: errorBuffer },
        );
      }

      // 회원가입 성공 시 Redis에서 인증 상태 삭제
      const verifiedKey = `email-verified:${registerDto.email}`;
      await this.redisService.del(verifiedKey);
      log(
        `Email verification status deleted from Redis for: ${registerDto.email}`,
      );

      return { user, profile };
    } catch (error) {
      log('Final error summary:');
      logBuffer.forEach((logMessage, index) => {
        log(`[${index + 1}] ${logMessage}`);
      });
      log(
        `Error details: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      );
      if (error instanceof Error && error.stack) {
        log(`Error stack: ${error.stack}`);
      }
      throw new InternalServerErrorException(
        '회원가입 중 오류가 발생했습니다.',
        { cause: error },
      );
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

    console.log(password);

    // const isPasswordValid = await this.hashService.compare(
    //   password,
    //   user.password,
    // );

    // if (!isPasswordValid) {
    //   throw new UnauthorizedException(
    //     '이메일 또는 비밀번호가 일치하지 않습니다.',
    //   );
    // }

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
    const logBuffer: string[] = [];
    const log = (message: string) => {
      logBuffer.push(message);
      this.logger.log(message);
    };

    log(`Starting email verification for code: ${verifyEmailDto.code}`);

    try {
      // Redis에서 코드로 이메일 찾기
      const codeKey = `verification-code:${verifyEmailDto.code}`;
      const email = await this.redisService.get(codeKey);
      log(`Looking up email with code key: ${codeKey}`);

      if (!email) {
        log('Verification code not found or expired');
        throw new UnauthorizedException(
          '유효하지 않거나 만료된 인증 코드입니다.',
        );
      }

      // 인증 완료 상태 저장
      const verifiedKey = `email-verified:${email}`;
      const verifiedTtlSeconds = 60 * 60; // 1시간
      await this.redisService.set(verifiedKey, 'verified', verifiedTtlSeconds);
      log(`Email verification status saved for: ${email}`);

      // 인증 코드 삭제
      await this.redisService.del(codeKey);
      log(`Verification code deleted for: ${email}`);

      return {
        verified: true,
        email,
      };
    } catch (error) {
      log(
        `Email verification failed: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
      );
      throw new UnauthorizedException(
        '인증에 실패했습니다. 유효하지 않거나 만료된 인증 코드입니다.',
        { cause: error },
      );
    }
  }

  async checkEmailVerification(email: string): Promise<boolean> {
    this.logger.log(`Checking email verification status for: ${email}`);
    const verifiedKey = `email-verified:${email}`;
    const verifiedValue = await this.redisService.get(verifiedKey);
    this.logger.log(
      `Checking verification - Key: ${verifiedKey}, Value: ${verifiedValue}`,
    );
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

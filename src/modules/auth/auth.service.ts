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
import { TokenService } from './token.service';
import { RequestWithUser } from './types/request.types';

@Injectable()
export class AuthService {
  protected readonly logger = new Logger(AuthService.name);

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
    private readonly tokenService: TokenService,
  ) {}
  private async processImagesInChunks(
    images: string[],
    profileId: string,
    log: (message: string) => void,
  ) {
    const CHUNK_SIZE = 3; // 동시에 처리할 이미지 수
    const results: Array<{
      profile: { id: string };
      imageUrl: string;
      key: string;
      isMain: boolean;
    } | null> = [];

    log(`Starting to process ${images.length} images`);
    log(`Input images: ${JSON.stringify(images, null, 2)}`);

    for (let i = 0; i < images.length; i += CHUNK_SIZE) {
      const chunk = images.slice(i, i + CHUNK_SIZE);
      log(
        `Processing chunk ${i / CHUNK_SIZE + 1}: ${JSON.stringify(chunk, null, 2)}`,
      );
      const chunkResults = await Promise.all(
        chunk.map(async (url, index) => {
          try {
            log(`Processing image ${i + index + 1}: ${url}`);
            if (!url) {
              log(`Skipping null/undefined URL at index ${i + index}`);
              return null;
            }

            log(`Extracting key from URL: ${url}`);
            const key = this.s3Service.extractKeyFromUrl(url);
            log(`Extracted key: ${key}`);
            log(
              `URL components: ${JSON.stringify(url.split('.amazonaws.com/'), null, 2)}`,
            );

            log(
              `Moving temp image to profile image: profileId=${profileId}, key=${key}`,
            );
            const moved = await this.profileImageService.moveTempToProfileImage(
              profileId,
              key,
            );
            log(`Moved image result: ${JSON.stringify(moved, null, 2)}`);

            const result = {
              profile: { id: profileId },
              imageUrl: moved.url,
              key: moved.key,
              isMain: i + index === 0,
            };
            log(
              `Created profile image object: ${JSON.stringify(result, null, 2)}`,
            );
            return result;
          } catch (err) {
            log(
              `Failed to process image ${i + index + 1}: ${
                err instanceof Error ? err.message : err
              }`,
            );
            if (err instanceof Error && err.stack) {
              log(`Error stack: ${err.stack}`);
            }
            return null;
          }
        }),
      );
      log(
        `Chunk ${i / CHUNK_SIZE + 1} results: ${JSON.stringify(chunkResults, null, 2)}`,
      );
      results.push(...chunkResults);
    }

    const filteredResults = results.filter(
      (img): img is NonNullable<typeof img> => img !== null,
    );
    log(`Final filtered results: ${JSON.stringify(filteredResults, null, 2)}`);
    return filteredResults;
  }

  async register(registerDto: RegisterDto) {
    const logBuffer: string[] = [];
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

    // 닉네임 중복 확인
    const existingNickname = await this.userService.findUserByNickname(
      registerDto.nickname,
    );
    if (existingNickname) {
      throw new UnauthorizedException('이미 존재하는 닉네임입니다.');
    }

    // 전화번호 중복 확인
    const existingPhone = await this.userService.findUserByPhone(
      registerDto.phone,
    );
    if (existingPhone) {
      throw new UnauthorizedException('이미 존재하는 전화번호입니다.');
    }

    // 비밀번호 확인
    if (registerDto.password !== registerDto.confirmPassword) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. 프로필 생성
      log('Starting profile creation');
      const profile = await qr.manager.save<Profile>(new Profile());
      log(`Profile created successfully with ID: ${profile.id}`);

      // 2. 유저 생성
      log('Starting user creation');
      const user = await qr.manager.save(User, {
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

      // 3. 프로필 이미지 저장
      log(
        `Checking registerDto.images: ${JSON.stringify(registerDto.images, null, 2)}`,
      );
      log(`registerDto.images type: ${typeof registerDto.images}`);
      log(`registerDto.images is array: ${Array.isArray(registerDto.images)}`);
      if (registerDto.images?.length) {
        log(`Found ${registerDto.images.length} images to process`);
        log('Starting profile image processing');
        const profileImages = await this.processImagesInChunks(
          registerDto.images,
          profile.id,
          log,
        );

        log(`Processed ${profileImages.length} images`);
        if (profileImages.length > 0) {
          log('Saving profile images to database');
          log(
            `Profile images data before save: ${JSON.stringify(
              profileImages,
              null,
              2,
            )}`,
          );

          // 각 이미지 객체의 구조 확인
          profileImages.forEach((img, index) => {
            log(`Image ${index + 1} structure check:`);
            log(`- profile.id: ${img.profile.id}`);
            log(`- imageUrl: ${img.imageUrl}`);
            log(`- key: ${img.key}`);
            log(`- isMain: ${img.isMain}`);
          });

          const savedImages = await qr.manager.save(
            ProfileImage,
            profileImages,
          );

          log(`Saved ${savedImages.length} profile images to database`);
          log(
            `Profile images after save: ${JSON.stringify(savedImages, null, 2)}`,
          );
          log(`Profile images saved successfully for user: ${user.id}`);
        } else {
          log('No profile images to save');
        }
      } else {
        log('No images found in registerDto.images');
      }

      // 4. MBTI 저장
      if (registerDto.mbti?.[0]) {
        log('Starting MBTI save');
        await qr.manager.save(Mbti, {
          mbti: registerDto.mbti[0],
          profile: { id: profile.id },
        });
        log(`MBTI saved successfully for user: ${user.id}`);
      }

      // 5. 피드백 저장
      if (registerDto.selfintro?.length) {
        log('Starting feedback save');
        const feedbacks = registerDto.selfintro.map((feedback) => ({
          profile: { id: profile.id },
          feedbackId: feedback,
        }));
        await qr.manager.save(UserFeedback, feedbacks);
        log(`User feedback saved successfully for user: ${user.id}`);
      }

      // 6. 자기소개 저장
      if (registerDto.listening?.length) {
        log('Starting introduction save');
        const introductions = registerDto.listening.map((intro) => ({
          profile: { id: profile.id },
          introductionId: intro,
        }));
        await qr.manager.save(UserIntroduction, introductions);
        log(`User introduction saved successfully for user: ${user.id}`);
      }

      // 7. 관심사 저장
      if (registerDto.interests?.length) {
        log('Starting interests save');
        const interests = registerDto.interests.map((interest) => ({
          profile: { id: profile.id },
          interestCategoryId: interest,
        }));
        await qr.manager.save(UserInterestCategory, interests);
        log(`User interests saved successfully for user: ${user.id}`);
      }

      // 8. 프로필 완성 상태 업데이트
      await qr.manager.update(
        User,
        { id: user.id },
        { isProfileComplete: true },
      );
      log(
        `User profile complete status updated successfully for user: ${user.id}`,
      );

      await qr.commitTransaction();
      log('Transaction committed successfully');

      // 회원가입 성공 시 Redis에서 인증 상태 삭제
      const verifiedKey = `email-verified:${registerDto.email}`;
      await this.redisService.del(verifiedKey);
      log(
        `Email verification status deleted from Redis for: ${registerDto.email}`,
      );

      return { user, profile };
    } catch (error) {
      await qr.rollbackTransaction();
      log('Transaction rolled back due to error');
      log(`${error instanceof Error ? error.message : '오류 확인해주세요'}`);
      if (error instanceof Error && error.stack) {
        log(`Error stack: ${error.stack}`);
      }
      throw new InternalServerErrorException(
        '회원가입 중 오류가 발생했습니다.',
        { cause: error },
      );
    } finally {
      await qr.release();
      log('QueryRunner released');
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

  async changePassword(
    email: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }
    const hashedPassword = await this.hashService.hash(newPassword);
    await this.userService.updateUserPassword(email, hashedPassword);
    return { message: '비밀번호 변경 성공' };
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

    const { accessToken, refreshToken } =
      await this.tokenService.generateTokens(user.id, user.role);

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

  //이메일 로그인
  async handleEmailLogin(
    loginDto: EmailLoginDto,
    req: Request,
    res: Response,
  ): Promise<LoginResponse> {
    const { email, password } = loginDto;
    const user = await this.validate(email, password);
    const { accessToken, refreshToken } =
      await this.tokenService.generateTokens(user.id, user.role);

    const accessTokenTtl =
      this.configService.get('jwt.accessTokenTtl', { infer: true }) || '30m';
    const refreshTokenTtl =
      this.configService.get('jwt.refreshTokenTtl', { infer: true }) || '7d';

    const accessTokenMaxAge = parseTimeToSeconds(accessTokenTtl) * 1000;
    const refreshTokenMaxAge = parseTimeToSeconds(refreshTokenTtl) * 1000;

    this.logger.debug(`Setting cookies with options:`, {
      accessTokenMaxAge,
      refreshTokenMaxAge,
      origin: req.headers.origin,
    });

    const accessOptions = this.createCookieOptions(
      accessTokenMaxAge,
      req.headers.origin,
    );
    const refreshOptions = this.createCookieOptions(
      refreshTokenMaxAge,
      req.headers.origin,
    );

    this.logger.debug(`Cookie options:`, {
      accessOptions,
      refreshOptions,
    });

    res.cookie('accessToken', accessToken, accessOptions);
    res.cookie('refreshToken', refreshToken, refreshOptions);

    this.logger.debug(`Cookies set successfully`);

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
  async handleLogout(req: RequestWithUser, res: Response) {
    try {
      const cookieOptions = this.logoutCookieOptions(req.headers.origin);

      // 쿠키 만료 설정
      res.cookie('accessToken', '', cookieOptions.accessOptions);
      res.cookie('refreshToken', '', cookieOptions.refreshOptions);

      // Refresh Token 취소
      const userId = req.user?.sub;
      const tokenId = (req.user as { tokenId?: string })?.tokenId;
      if (userId && tokenId) {
        await this.tokenService.revokeRefreshToken(userId, tokenId);
      }

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

  //쿠키
  createCookieOptions(maxAge: number, origin?: string): CookieOptions {
    this.logger.debug(
      `Creating cookie options with maxAge: ${maxAge}, origin: ${origin}`,
    );
    let domain: string | undefined;

    const configDomain = this.configService.get('app.host', {
      infer: true,
    });
    if (configDomain) {
      domain = configDomain;
      this.logger.debug(`Using config domain: ${domain}`);
    } else if (origin) {
      // 환경 변수에 설정이 없는 경우 origin에서 도메인 추출
      const hostname = new URL(origin).hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        domain = 'localhost';
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        domain = hostname;
      }
      this.logger.debug(`Using origin hostname as domain: ${domain}`);
    }

    const options: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      domain: '.fit-date.co.kr', //배포할때 삭제하기,
      path: '/',
    };

    this.logger.debug(`Created cookie options:`, options);
    return options;
  }

  //로그아웃
  logoutCookieOptions(origin?: string): {
    accessOptions: CookieOptions;
    refreshOptions: CookieOptions;
  } {
    this.logger.debug(`Creating logout cookie options for origin: ${origin}`);
    const options = {
      accessOptions: this.createCookieOptions(0, origin),
      refreshOptions: this.createCookieOptions(0, origin),
    };
    this.logger.debug(`Created logout cookie options:`, options);
    return options;
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

    const { accessToken, refreshToken } =
      await this.tokenService.generateTokens(user.id, user.role);

    const accessTokenTtl =
      this.configService.get('jwt.accessTokenTtl', { infer: true }) || '30m';
    const refreshTokenTtl =
      this.configService.get('jwt.refreshTokenTtl', { infer: true }) || '7d';

    const accessTokenMaxAge = parseTimeToSeconds(accessTokenTtl) * 1000;
    const refreshTokenMaxAge = parseTimeToSeconds(refreshTokenTtl) * 1000;

    const tokenResponse = {
      accessToken,
      refreshToken,
      accessOptions: this.createCookieOptions(accessTokenMaxAge, origin),
      refreshOptions: this.createCookieOptions(refreshTokenMaxAge, origin),
    };

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

  async deleteAccount(userId: string) {
    const logBuffer: string[] = [];
    const log = (message: string) => {
      logBuffer.push(message);
      this.logger.log(message);
    };

    log(`Starting account deletion for user: ${userId}`);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. 사용자 정보 조회
      const user = await qr.manager.findOne(User, {
        where: { id: userId },
        relations: [
          'profile',
          'profile.profileImages',
          'profile.mbti',
          'profile.feedback',
          'profile.introduction',
          'profile.interests',
        ],
      });

      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      // 2. 프로필 이미지 삭제
      log('Deleting profile images');
      const profileImages = await qr.manager.find(ProfileImage, {
        where: { profile: { id: user.profile.id } },
      });

      // S3에서 이미지 삭제
      for (const image of profileImages) {
        const bucketName = this.configService.getOrThrow('aws.bucketName', {
          infer: true,
        });
        await this.s3Service.deleteFile(image.key, bucketName);
      }

      // 데이터베이스에서 이미지 레코드 삭제
      await qr.manager.remove(ProfileImage, profileImages);
      log('Profile images deleted successfully');

      // 3. MBTI 삭제
      log('Deleting MBTI');
      await qr.manager.delete(Mbti, { profile: { id: user.profile.id } });
      log('MBTI deleted successfully');

      // 4. 피드백 삭제
      log('Deleting feedback');
      await qr.manager.delete(UserFeedback, {
        profile: { id: user.profile.id },
      });
      log('Feedback deleted successfully');

      // 5. 자기소개 삭제
      log('Deleting introduction');
      await qr.manager.delete(UserIntroduction, {
        profile: { id: user.profile.id },
      });
      log('Introduction deleted successfully');

      // 6. 관심사 삭제
      log('Deleting interests');
      await qr.manager.delete(UserInterestCategory, {
        profile: { id: user.profile.id },
      });
      log('Interests deleted successfully');

      // 7. 프로필 삭제
      log('Deleting profile');
      await qr.manager.remove(Profile, user.profile);
      log('Profile deleted successfully');

      // 8. 사용자 삭제
      log('Deleting user');
      await qr.manager.remove(User, user);
      log('User deleted successfully');

      // 9. Redis에서 인증 상태 삭제
      const verifiedKey = `email-verified:${user.email}`;
      await this.redisService.del(verifiedKey);
      log('Email verification status deleted from Redis');

      await qr.commitTransaction();
      log('Account deletion completed successfully');

      return { message: '회원탈퇴가 완료되었습니다.' };
    } catch (error) {
      await qr.rollbackTransaction();
      log('Transaction rolled back due to error');
      log(`${error instanceof Error ? error.message : '오류 확인해주세요'}`);
      if (error instanceof Error && error.stack) {
        log(`Error stack: ${error.stack}`);
      }
      throw new InternalServerErrorException(
        '회원탈퇴 중 오류가 발생했습니다.',
        { cause: error },
      );
    } finally {
      await qr.release();
      log('QueryRunner released');
    }
  }

  // 토큰 갱신 메서드 추가
  async refreshTokens(
    userId: string,
    oldTokenId: string,
    origin?: string,
  ): Promise<JwtTokenResponse> {
    const { accessToken, refreshToken } =
      await this.tokenService.rotateRefreshToken(userId, oldTokenId);

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

  async checkAndRefreshActivity(userId: string): Promise<boolean> {
    try {
      // 토큰 유효성 검사
      const isValid = await this.tokenService.validateRefreshToken(
        userId,
        userId,
      );
      if (!isValid) {
        return false;
      }

      // 토큰 갱신
      await this.tokenService.rotateRefreshToken(userId, userId);
      return true;
    } catch (error) {
      this.logger.error(`Activity check failed for user ${userId}:`, error);
      return false;
    }
  }
}

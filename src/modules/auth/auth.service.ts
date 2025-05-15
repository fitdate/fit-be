import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { HashService } from './hash/hash.service';
import { AllConfig } from 'src/common/config/config.types';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/common/enum/user-role.enum';
import { RegisterDto } from './dto/register.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { RedisService } from '../redis/redis.service';
import { AuthProvider } from './types/oatuth.types';
import { SendVerificationEmailDto } from './dto/send-verification-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Response, Request } from 'express';
import { User } from '../user/entities/user.entity';
import { LoginResponse } from './types/auth.types';
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
import { TokenService } from '../token/token.service';
import { RequestWithUser } from './types/request.types';
import { EmailAuthService } from './services/email-auth.service';
import { InterestCategoryService } from '../profile/interest-category/common/interest-category.service';
import { FeedbackService } from '../profile/feedback/common/feedback.service';
import { IntroductionService } from '../profile/introduction/common/introduction.service';
import { TokenMetadata } from '../token/types/token-payload.types';
import { v4 as uuidv4 } from 'uuid';
import { SessionService } from '../session/session.service';
import { TokenPayload } from '../token/types/token-payload.types';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtService } from '@nestjs/jwt';
import { SocialRegisterDto } from './dto/social-register.dto';

function isTokenPayload(obj: unknown): obj is TokenPayload {
  return !!obj && typeof obj === 'object' && 'sub' in obj && 'sessionId' in obj;
}

@Injectable()
export class AuthService {
  protected readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly hashService: HashService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
    private readonly s3Service: S3Service,
    private readonly profileImageService: ProfileImageService,
    private readonly tokenService: TokenService,
    private readonly emailAuthService: EmailAuthService,
    private readonly interestCategoryService: InterestCategoryService,
    private readonly feedbackService: FeedbackService,
    private readonly introductionService: IntroductionService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
  ) {}

  // 회원가입
  async register(registerDto: RegisterDto) {
    const logBuffer: string[] = [];
    const log = (message: string) => {
      logBuffer.push(message);
      this.logger.log(message);
    };

    // log(`Attempting to register new user with email: ${registerDto.email}`);

    // 이메일 인증 여부 확인
    // const isEmailVerified = await this.emailAuthService.checkEmailVerification(
    //   registerDto.email,
    // );
    // if (!isEmailVerified) {
    //   throw new UnauthorizedException('이메일 인증이 필요합니다.');
    // }

    // 기존 유저 확인
    const existingUser = await this.userService.findUserByEmail(
      registerDto.email,
    );
    if (existingUser) {
      if (existingUser.authProvider !== AuthProvider.EMAIL) {
        throw new UnauthorizedException(
          '소셜 로그인으로 가입한 유저입니다. 소셜 로그인 후 이용해주세요.',
        );
      }
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

    // 비밀번호 해싱
    const hashedPassword = await this.hashService.hash(registerDto.password);

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
        password: hashedPassword,
        nickname: registerDto.nickname,
        name: registerDto.name,
        birthday: registerDto.birthday,
        height: registerDto.height,
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
        const profileImages =
          await this.profileImageService.processImagesInChunks(
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

          // 프로필 이미지가 2장 미만인지 확인**
          if (savedImages.length < 2) {
            log('Profile images are less than 2. Throwing error.');
            throw new UnauthorizedException(
              '프로필 이미지는 최소 2장 이상이어야 합니다.',
            );
          }
        } else {
          log('No profile images to save');
        }
      } else {
        log('No images found in registerDto.images');
        throw new UnauthorizedException(
          '프로필 이미지는 최소 2장 이상이어야 합니다.',
        );
      }

      // 4. MBTI 저장
      if (registerDto.mbti) {
        log('Starting MBTI save');
        await qr.manager.save(Mbti, {
          mbti: registerDto.mbti,
          profile: { id: profile.id },
        });
        log(`MBTI saved successfully for user: ${user.id}`);
      }

      // 5. 자기소개 저장
      if (registerDto.selfintro?.length) {
        log('Starting introduction save');
        const introductions = await Promise.all(
          registerDto.selfintro.map(async (introductionName) => {
            const existingIntroduction =
              await this.introductionService.searchIntroductions(
                introductionName,
              );
            if (existingIntroduction.length > 0) {
              return existingIntroduction[0];
            }
            throw new UnauthorizedException(
              `존재하지 않는 자기소개입니다: ${introductionName}`,
            );
          }),
        );
        const userIntroductions = introductions.map((introduction) => ({
          profile: { id: profile.id },
          introduction: { id: introduction.id },
        }));
        await qr.manager.save(UserIntroduction, userIntroductions);
        log(`User introductions saved successfully for user: ${user.id}`);
      }

      // 6. 피드백 저장
      if (registerDto.listening?.length) {
        log('Starting feedback save');
        const feedbacks = await Promise.all(
          registerDto.listening.map(async (feedbackName) => {
            const existingFeedback =
              await this.feedbackService.searchFeedbacks(feedbackName);
            if (existingFeedback.length > 0) {
              return existingFeedback[0];
            }
            throw new UnauthorizedException(
              `존재하지 않는 피드백입니다: ${feedbackName}`,
            );
          }),
        );
        const userFeedbacks = feedbacks.map((feedback) => ({
          profile: { id: profile.id },
          feedback: { id: feedback.id },
        }));
        await qr.manager.save(UserFeedback, userFeedbacks);
        log(`User feedbacks saved successfully for user: ${user.id}`);
      }

      // 7. 관심사 저장
      if (registerDto.interests?.length) {
        log('Starting interests save');

        const interestCategories = await Promise.all(
          registerDto.interests.map(async (interestName) => {
            const existingCategories =
              await this.interestCategoryService.searchInterestCategories(
                interestName,
              );
            if (existingCategories.length > 0) {
              log(`Found existing interest category: ${interestName}`);
              return existingCategories[0];
            }
            throw new UnauthorizedException(
              `존재하지 않는 관심사입니다: ${interestName}`,
            );
          }),
        );

        const userInterestCategories = interestCategories.map((category) => ({
          profile: { id: profile.id },
          interestCategory: { id: category.id },
        }));

        await qr.manager.save(UserInterestCategory, userInterestCategories);
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
      // const verifiedKey = `email-verified:${registerDto.email}`;
      // await this.redisService.del(verifiedKey);
      // log(
      //   `Email verification status deleted from Redis for: ${registerDto.email}`,
      // );

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

  // 소셜 회원가입
  async socialRegister(userId: string, socialRegisterDto: SocialRegisterDto) {
    const logBuffer: string[] = [];
    const log = (message: string) => {
      logBuffer.push(message);
      this.logger.log(message);
    };

    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    const existingUser = await this.userService.findUserByEmail(user.email);
    if (existingUser) {
      if (existingUser.isProfileComplete) {
        throw new UnauthorizedException(
          '이미 회원 가입이 완료된 유저입니다. 이메일 로그인 후 이용해주세요.',
        );
      }
    }

    // 닉네임 중복 확인
    const existingNickname = await this.userService.findUserByNickname(
      socialRegisterDto.nickname,
    );
    if (existingNickname) {
      throw new UnauthorizedException('이미 존재하는 닉네임입니다.');
    }

    // 전화번호 중복 확인
    const existingPhone = await this.userService.findUserByPhone(
      socialRegisterDto.phone,
    );
    if (existingPhone) {
      throw new UnauthorizedException('이미 존재하는 전화번호입니다.');
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
        nickname: socialRegisterDto.nickname,
        name: socialRegisterDto.name,
        birthday: socialRegisterDto.birthday,
        height: socialRegisterDto.height,
        gender: socialRegisterDto.gender,
        region: socialRegisterDto.region,
        phone: socialRegisterDto.phone,
        role: UserRole.USER,
        isProfileComplete: socialRegisterDto.isProfileComplete,
        job: socialRegisterDto.job,
        profile: { id: profile.id },
      });
      log(`User created successfully with ID: ${user.id}`);

      // 3. 프로필 이미지 저장
      log(
        `Checking socialRegisterDto.images: ${JSON.stringify(socialRegisterDto.images, null, 2)}`,
      );
      log(`socialRegisterDto.images type: ${typeof socialRegisterDto.images}`);
      log(
        `socialRegisterDto.images is array: ${Array.isArray(
          socialRegisterDto.images,
        )}`,
      );
      if (socialRegisterDto.images?.length) {
        log(`Found ${socialRegisterDto.images.length} images to process`);
        log('Starting profile image processing');
        const profileImages =
          await this.profileImageService.processImagesInChunks(
            socialRegisterDto.images,
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

          // 프로필 이미지가 2장 미만인지 확인**
          if (savedImages.length < 2) {
            log('Profile images are less than 2. Throwing error.');
            throw new UnauthorizedException(
              '프로필 이미지는 최소 2장 이상이어야 합니다.',
            );
          }
        } else {
          log('No profile images to save');
        }
      } else {
        log('No images found in registerDto.images');
        throw new UnauthorizedException(
          '프로필 이미지는 최소 2장 이상이어야 합니다.',
        );
      }

      // 4. MBTI 저장
      if (socialRegisterDto.mbti) {
        log('Starting MBTI save');
        await qr.manager.save(Mbti, {
          mbti: socialRegisterDto.mbti,
          profile: { id: profile.id },
        });
        log(`MBTI saved successfully for user: ${user.id}`);
      }

      // 5. 자기소개 저장
      if (socialRegisterDto.selfintro?.length) {
        log('Starting introduction save');
        const introductions = await Promise.all(
          socialRegisterDto.selfintro.map(async (introductionName) => {
            const existingIntroduction =
              await this.introductionService.searchIntroductions(
                introductionName,
              );
            if (existingIntroduction.length > 0) {
              return existingIntroduction[0];
            }
            throw new UnauthorizedException(
              `존재하지 않는 자기소개입니다: ${introductionName}`,
            );
          }),
        );
        const userIntroductions = introductions.map((introduction) => ({
          profile: { id: profile.id },
          introduction: { id: introduction.id },
        }));
        await qr.manager.save(UserIntroduction, userIntroductions);
        log(`User introductions saved successfully for user: ${user.id}`);
      }

      // 6. 피드백 저장
      if (socialRegisterDto.listening?.length) {
        log('Starting feedback save');
        const feedbacks = await Promise.all(
          socialRegisterDto.listening.map(async (feedbackName) => {
            const existingFeedback =
              await this.feedbackService.searchFeedbacks(feedbackName);
            if (existingFeedback.length > 0) {
              return existingFeedback[0];
            }
            throw new UnauthorizedException(
              `존재하지 않는 피드백입니다: ${feedbackName}`,
            );
          }),
        );
        const userFeedbacks = feedbacks.map((feedback) => ({
          profile: { id: profile.id },
          feedback: { id: feedback.id },
        }));
        await qr.manager.save(UserFeedback, userFeedbacks);
        log(`User feedbacks saved successfully for user: ${user.id}`);
      }

      // 7. 관심사 저장
      if (socialRegisterDto.interests?.length) {
        log('Starting interests save');

        const interestCategories = await Promise.all(
          socialRegisterDto.interests.map(async (interestName) => {
            const existingCategories =
              await this.interestCategoryService.searchInterestCategories(
                interestName,
              );
            if (existingCategories.length > 0) {
              log(`Found existing interest category: ${interestName}`);
              return existingCategories[0];
            }
            throw new UnauthorizedException(
              `존재하지 않는 관심사입니다: ${interestName}`,
            );
          }),
        );

        const userInterestCategories = interestCategories.map((category) => ({
          profile: { id: profile.id },
          interestCategory: { id: category.id },
        }));

        await qr.manager.save(UserInterestCategory, userInterestCategories);
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
    } catch (error) {
      await qr.rollbackTransaction();
      log('Transaction rolled back due to error');
      log(`${error instanceof Error ? error.message : '오류 확인해주세요'}`);
      if (error instanceof Error && error.stack) {
        log(`Error stack: ${error.stack}`);
      }
      throw new InternalServerErrorException(
        '소셜 회원가입 중 오류가 발생했습니다.',
        { cause: error },
      );
    } finally {
      await qr.release();
      log('QueryRunner released');
    }
  }

  // 닉네임 중복 확인
  async checkNickname(nickname: string) {
    const user = await this.userService.findUserByNickname(nickname);
    if (user) {
      throw new UnauthorizedException('이미 존재하는 닉네임입니다.');
    }
  }

  // 이메일 중복 확인
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

  // 비밀번호 변경
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    const isPasswordValid = await this.userService.checkUserPassword(
      userId,
      oldPassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('기존 비밀번호가 일치하지 않습니다.');
    }

    if (newPassword !== confirmPassword) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    if (!newPassword || !confirmPassword) {
      throw new UnauthorizedException('새 비밀번호를 입력해주세요.');
    }

    if (newPassword.length < 8) {
      throw new UnauthorizedException('비밀번호는 8자 이상이어야 합니다.');
    }

    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    const email = user.email;

    const hashedPassword = await this.hashService.hash(newPassword);
    if (hashedPassword === user.password) {
      throw new UnauthorizedException('기존 비밀번호와 동일합니다.');
    }
    await this.userService.updateUserPassword(email, hashedPassword);
    return { message: '비밀번호 변경 성공' };
  }

  // 이메일 로그인 유효성 검사
  async validate(email: string, password: string): Promise<User> {
    this.logger.log(`Validating user with email: ${email}`);
    const user = await this.userService.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    const isPasswordValid = user.password
      ? await this.hashService.compare(password, user.password)
      : false;

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    this.logger.log(`Successfully validated user with email: ${email}`);
    return user;
  }

  //이메일 로그인
  async handleEmailLogin(
    loginDto: EmailLoginDto,
    req: Request,
    res: Response,
  ): Promise<LoginResponse> {
    const { email, password } = loginDto;
    const user = await this.validate(email, password);

    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    // 세션 ID와 토큰 ID 생성
    const sessionId = uuidv4();
    const tokenId = uuidv4();

    // 메타데이터 생성
    const userAgentStr = req.headers['user-agent'] || 'unknown';
    const metadata: TokenMetadata = {
      ip: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: userAgentStr,
      sessionId,
    };

    // 세션 생성
    await this.sessionService.createSession(user.id, tokenId, metadata);
    await this.sessionService.updateActiveSession(user.id);

    // 토큰 생성 및 쿠키 옵션 통합
    const tokenPayload: TokenPayload = {
      sub: user.id,
      role: user.role,
      type: 'access',
      tokenId,
      sessionId,
    };

    const origin = req.headers.origin;
    const tokens = await this.tokenService.generateAndSetTokens(
      user.id,
      tokenPayload,
      origin,
    );

    res.cookie('accessToken', tokens.accessToken, tokens.accessOptions);
    if (tokens.refreshToken && tokens.refreshOptions) {
      res.cookie('refreshToken', tokens.refreshToken, tokens.refreshOptions);
    }

    this.logger.debug(`쿠키가 성공적으로 설정되었습니다.`);

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
      const cookieOptions = this.tokenService.getLogoutCookieOptions(
        req.headers.origin,
      );

      res.cookie('accessToken', '', cookieOptions.accessOptions);
      if (cookieOptions.refreshOptions) {
        res.cookie('refreshToken', '', cookieOptions.refreshOptions);
      }

      const userId = req.user?.sub;
      const tokenId = (req.user as { tokenId?: string })?.tokenId;

      if (userId) {
        await this.sessionService.deleteSession(userId);
        await this.sessionService.deleteActiveSession(userId);
      }

      if (userId && tokenId) {
        await this.tokenService.deleteRefreshToken(userId, tokenId);
      }

      return {
        message: '로그아웃 성공',
      };
    } catch (error) {
      this.logger.error('Logout failed', error);
      throw new UnauthorizedException('로그아웃에 실패했습니다.');
    }
  }

  // 이메일 인증 코드 전송
  async sendVerificationEmail(
    sendVerificationEmailDto: SendVerificationEmailDto,
  ): Promise<{ success: boolean }> {
    return this.emailAuthService.sendVerificationEmail(
      sendVerificationEmailDto,
    );
  }

  // 이메일 인증 코드 검증
  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ verified: boolean; email: string }> {
    return this.emailAuthService.verifyEmail(verifyEmailDto);
  }

  // 이메일 인증 상태 확인
  async checkEmailVerification(email: string): Promise<boolean> {
    return this.emailAuthService.checkEmailVerification(email);
  }

  // 회원 탈퇴
  async deleteAccount(userId: string, res: Response) {
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
      // 1. 사용자 정보 조회 (연관 데이터 포함)
      const user = await qr.manager.findOne(User, {
        where: { id: userId },
        relations: [
          'profile',
          'profile.profileImage',
          'profile.mbti',
          'profile.userFeedbacks',
          'profile.userIntroductions',
          'profile.interestCategory',
          'likes',
          'likedBy',
          'passes',
          'passedBy',
          'payments',
          'coffeeChats',
          'coffeeChatsReceived',
          'sentAcceptedCoffeeChats',
          'receivedAcceptedCoffeeChats',
        ],
      });

      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      // 1. 프로필 이미지 삭제 (S3 + DB)
      log('Deleting profile images');
      const profileImages = await qr.manager.find(ProfileImage, {
        where: { profile: { id: user.profile.id } },
      });
      for (const image of profileImages) {
        const bucketName = this.configService.getOrThrow('aws.bucketName', {
          infer: true,
        });
        await this.s3Service.deleteFile(image.key, bucketName);
      }
      await qr.manager.remove(ProfileImage, profileImages);
      log('Profile images permanently deleted successfully');

      // 2. UserFeedback 삭제
      const userFeedbacks = await qr.manager.find(UserFeedback, {
        where: { profile: { id: user.profile.id } },
      });
      if (userFeedbacks.length > 0) {
        await qr.manager.delete(
          UserFeedback,
          userFeedbacks.map((fb) => fb.id),
        );
      }
      // 3. UserIntroduction 삭제
      const userIntroductions = await qr.manager.find(UserIntroduction, {
        where: { profile: { id: user.profile.id } },
      });
      if (userIntroductions.length > 0) {
        await qr.manager.delete(
          UserIntroduction,
          userIntroductions.map((intro) => intro.id),
        );
      }
      // 4. UserInterestCategory 삭제
      const userInterestCategories = await qr.manager.find(
        UserInterestCategory,
        {
          where: { profile: { id: user.profile.id } },
        },
      );
      if (userInterestCategories.length > 0) {
        await qr.manager.delete(
          UserInterestCategory,
          userInterestCategories.map((cat) => cat.id),
        );
      }
      // 5. MBTI 삭제
      if (user.profile.mbti) {
        await qr.manager.delete(Mbti, { id: user.profile.mbti.id });
      }
      log('MBTI, feedback, introduction, interests permanently deleted');

      // 6. 프로필 삭제 (가장 마지막!)
      log('Permanently deleting profile');
      await qr.manager.delete(Profile, user.profile.id);
      log('Profile permanently deleted successfully');

      log('Permanently deleting related entities');
      for (const like of [...user.likes, ...user.likedBy]) {
        await qr.manager.delete(like.constructor, like.id);
      }
      for (const pass of [...user.passes, ...user.passedBy]) {
        await qr.manager.delete(pass.constructor, pass.id);
      }
      for (const payment of user.payments) {
        await qr.manager.delete(payment.constructor, payment.id);
      }
      for (const chat of [...user.coffeeChats, ...user.coffeeChatsReceived]) {
        await qr.manager.delete(chat.constructor, chat.id);
      }
      for (const acc of [
        ...user.sentAcceptedCoffeeChats,
        ...user.receivedAcceptedCoffeeChats,
      ]) {
        await qr.manager.delete(acc.constructor, acc.id);
      }
      log('Related entities permanently deleted');

      // 6. User permanent delete
      log('Permanently deleting user');
      await qr.manager.delete(User, user.id);
      log('User permanently deleted successfully');

      // 7. Redis에서 인증 상태 삭제
      const verifiedKey = `email-verified:${user.email}`;
      await this.redisService.del(verifiedKey);
      log('Email verification status deleted from Redis');

      // 8. Redis에서 session, token 삭제
      log('Deleting session and token');
      await this.redisService.del(`session:${user.id}:*`);
      await this.redisService.del(`active_session:${user.id}:*`);
      await this.redisService.del(`access_token:${user.id}:*`);
      await this.redisService.del(`refresh_token:${user.id}:*`);
      log('Session and token deleted from Redis');

      await qr.commitTransaction();
      log('Account deletion completed successfully');

      // 회원탈퇴 시 토큰 쿠키 삭제
      res.cookie('accessToken', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.fit-date.co.kr',
        path: '/',
        maxAge: 0,
      });
      res.cookie('refreshToken', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.fit-date.co.kr',
        path: '/',
        maxAge: 0,
      });

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

  // 토큰 재발급
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    let payload: TokenPayload;
    try {
      const decoded: unknown = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow('jwt.refreshTokenSecret', {
          infer: true,
        }),
      });

      if (!isTokenPayload(decoded)) {
        throw new UnauthorizedException(
          'refreshToken payload가 올바르지 않습니다.',
        );
      }

      payload = decoded;

      const tokenId = payload.tokenId || payload.jti || '';
      const sessionId = payload.sessionId || '';

      const { accessToken, refreshToken: newRefreshToken } =
        await this.tokenService.generateTokens(payload.sub, {
          ...payload,
          tokenId,
          sessionId,
        });

      this.logger.log('토큰이 성공적으로 재발급되었습니다.');
      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('refreshToken이 유효하지 않습니다.');
    }
  }
}

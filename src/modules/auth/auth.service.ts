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
import { CreateInterestCategoryDto } from '../profile/interest-category/dto/create-interest-category.dto';
import { FeedbackService } from '../profile/feedback/common/feedback.service';
import { CreateFeedbackDto } from '../profile/feedback/dto/create-feedback.dto';
import { CreateIntroductionDto } from '../profile/introduction/dto/create-introduction.dto';
import { IntroductionService } from '../profile/introduction/common/introduction.service';
import { TokenMetadata } from '../token/types/token-payload.types';
import { UAParser } from 'ua-parser-js';
import { v4 as uuidv4 } from 'uuid';
import { parseTimeToSeconds } from 'src/common/util/time.util';
import { SessionService } from '../session/session.service';
import { TokenPayload } from '../token/types/token-payload.types';
import { CoffeeChat } from '../coffee-chat/entities/coffee-chat.entity';

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
  ) {}

  // 회원가입
  async register(registerDto: RegisterDto) {
    const logBuffer: string[] = [];
    const log = (message: string) => {
      logBuffer.push(message);
      this.logger.log(message);
    };

    log(`Attempting to register new user with email: ${registerDto.email}`);

    // 이메일 인증 여부 확인
    const isEmailVerified = await this.emailAuthService.checkEmailVerification(
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

        // 피드백 이름으로 Feedback 찾기 또는 생성하기
        const feedbacks = await Promise.all(
          registerDto.selfintro.map(async (feedbackName) => {
            const existingFeedback =
              await this.feedbackService.searchFeedbacks(feedbackName);
            if (existingFeedback.length > 0) {
              return existingFeedback[0];
            }

            log(`Creating new feedback: ${feedbackName}`);
            const createDto: CreateFeedbackDto = { name: feedbackName };
            return this.feedbackService.createFeedbackCategory(createDto);
          }),
        );
        const userFeedbacks = feedbacks.map((feedback) => ({
          profile: { id: profile.id },
          feedback: { id: feedback.id },
        }));
        await qr.manager.save(UserFeedback, userFeedbacks);
        log(`User feedbacks saved successfully for user: ${user.id}`);
      }

      // 6. 자기소개 저장
      if (registerDto.listening?.length) {
        log('Starting introduction save');
        const introductions = await Promise.all(
          registerDto.listening.map(async (introductionName) => {
            const existingIntroduction =
              await this.introductionService.searchIntroductions(
                introductionName,
              );
            if (existingIntroduction.length > 0) {
              return existingIntroduction[0];
            }

            log(`Creating new introduction: ${introductionName}`);
            const createDto: CreateIntroductionDto = { name: introductionName };
            return this.introductionService.createIntroduction(createDto);
          }),
        );
        const userIntroductions = introductions.map((introduction) => ({
          profile: { id: profile.id },
          introduction: { id: introduction.id },
        }));
        await qr.manager.save(UserIntroduction, userIntroductions);
        log(`User introductions saved successfully for user: ${user.id}`);
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

            log(`Creating new interest category: ${interestName}`);
            const createDto: CreateInterestCategoryDto = { name: interestName };
            return this.interestCategoryService.createInterestCategory(
              createDto,
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

  //이메일 로그인
  async handleEmailLogin(
    loginDto: EmailLoginDto,
    req: Request,
    res: Response,
  ): Promise<LoginResponse> {
    const { email, password } = loginDto;
    const user = await this.validate(email, password);

    // 디바이스 ID 추출
    const deviceId: string =
      (req.cookies?.deviceId as string) ||
      (req.headers['x-device-id'] as string) ||
      'unknown-device';

    // 세션 ID와 토큰 ID 생성
    const sessionId = uuidv4();
    const tokenId = uuidv4();

    // 메타데이터 생성
    const userAgentStr = req.headers['user-agent'] || 'unknown';
    const parser = new UAParser(userAgentStr);
    const device = parser.getDevice();
    const deviceType = device?.type || 'desktop';
    const browserInfo = parser.getBrowser();
    const browser = browserInfo?.name || 'unknown';
    const osInfo = parser.getOS();
    const os = osInfo?.name || 'unknown';

    const metadata: TokenMetadata = {
      ip: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: userAgentStr,
      deviceId,
      deviceType,
      browser,
      os,
      sessionId,
    };

    // 세션 생성
    await this.sessionService.createSession(user.id, tokenId, metadata);
    await this.sessionService.updateActiveSession(user.id, deviceId);

    // 토큰 생성
    const tokenPayload: TokenPayload = {
      sub: user.id,
      role: user.role,
      type: 'access',
      tokenId,
      sessionId,
      deviceType,
    };

    const tokens = await this.tokenService.generateTokens(
      user.id,
      deviceType,
      tokenPayload,
    );

    const accessTokenTtl =
      this.configService.get('jwt.accessTokenTtl', { infer: true }) || '30m';
    const refreshTokenTtl =
      this.configService.get('jwt.refreshTokenTtl', { infer: true }) || '7d';

    const accessTokenMaxAge = parseTimeToSeconds(accessTokenTtl) * 1000;
    const refreshTokenMaxAge = parseTimeToSeconds(refreshTokenTtl) * 1000;

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.fit-date.co.kr',
      path: '/',
      maxAge: accessTokenMaxAge,
    });

    if (tokens.refreshToken) {
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.fit-date.co.kr',
        path: '/',
        maxAge: refreshTokenMaxAge,
      });
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
      const deviceId: string =
        (req.cookies?.deviceId as string) ||
        (req.headers['x-device-id'] as string) ||
        'unknown-device';

      if (userId) {
        await this.sessionService.deleteSession(userId, deviceId);
        await this.sessionService.deleteActiveSession(userId, deviceId);
      }

      if (userId && tokenId) {
        await this.tokenService.deleteRefreshToken(userId, deviceId, tokenId);
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
      // 1. 사용자 정보 조회 (연관 데이터 포함)
      const user = await qr.manager.findOne(User, {
        where: { id: userId },
        relations: [
          'profile',
          'profile.profileImage',
          'profile.mbti',
          'profile.feedback',
          'profile.introduction',
          'profile.interests',
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
      await qr.manager.softRemove(profileImages);
      log('Profile images soft deleted successfully');

      log('Soft deleting MBTI, feedback, introduction, interests');
      await qr.manager.softDelete(Mbti, {
        profile: { id: user.profile.id },
      });
      await qr.manager.softDelete(UserFeedback, {
        profile: { id: user.profile.id },
      });
      await qr.manager.softDelete(UserIntroduction, {
        profile: { id: user.profile.id },
      });
      await qr.manager.softDelete(UserInterestCategory, {
        profile: { id: user.profile.id },
      });
      log('MBTI, feedback, introduction, interests soft deleted');

      log('Soft deleting profile');
      await qr.manager.softRemove(Profile, user.profile);
      log('Profile soft deleted successfully');

      log('Soft deleting related entities');
      for (const like of [...user.likes, ...user.likedBy]) {
        await qr.manager.softRemove(like);
      }
      for (const pass of [...user.passes, ...user.passedBy]) {
        await qr.manager.softRemove(pass);
      }
      for (const payment of user.payments) {
        await qr.manager.softRemove(payment);
      }
      for (const chat of [...user.coffeeChats, ...user.coffeeChatsReceived]) {
        await qr.manager.softRemove(chat);
      }
      for (const acc of [
        ...user.sentAcceptedCoffeeChats,
        ...user.receivedAcceptedCoffeeChats,
      ]) {
        await qr.manager.softRemove(acc);
      }
      log('Related entities soft deleted');

      // 6. User soft delete
      log('Soft deleting user');
      await qr.manager.softRemove(user);
      log('User soft deleted successfully');

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
}

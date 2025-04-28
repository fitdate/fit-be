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
import { JwtTokenResponse, LoginResponse } from './types/auth.types';
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
import { TokenService } from './services/token.service';
import { RequestWithUser } from './types/request.types';
import { EmailAuthService } from './services/email-auth.service';
import { InterestCategoryService } from '../profile/interest-category/common/interest-category.service';
import { CreateInterestCategoryDto } from '../profile/interest-category/dto/create-interest-category.dto';

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
  ) {}

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

        // 관심사 이름으로 InterestCategory 찾기 또는 생성하기
        const interestCategories = await Promise.all(
          registerDto.interests.map(async (interestName) => {
            // 관심사 이름으로 검색
            const existingCategories =
              await this.interestCategoryService.searchInterestCategories(
                interestName,
              );
            if (existingCategories.length > 0) {
              log(`Found existing interest category: ${interestName}`);
              return existingCategories[0];
            }

            // 관심사 이름이 없으면 새로 생성
            log(`Creating new interest category: ${interestName}`);
            const createDto: CreateInterestCategoryDto = { name: interestName };
            return this.interestCategoryService.createInterestCategory(
              createDto,
            );
          }),
        );

        // UserInterestCategory와 연결
        const userInterestCategories = interestCategories.map((category) => ({
          profile: { id: profile.id },
          interestCategory: { id: category.id },
        }));

        // 저장
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

  async validate(email: string, password: string): Promise<User> {
    this.logger.log(`Validating user with email: ${email}`);
    const user = await this.userService.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    // const isPasswordValid = await this.hashService.compare(
    //   password,
    //   user.password,
    // );

    // if (!isPasswordValid) {
    //   throw new UnauthorizedException(
    //     '이메일 또는 비밀번호가 일치하지 않습니다.',
    //   );
    // }

    if (password !== user.password) {
      this.logger.log(`Password validation failed for email: ${email}`);
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

    return this.tokenService.generateAndSetTokens(user.id, user.role, origin);
  }

  //이메일 로그인
  async handleEmailLogin(
    loginDto: EmailLoginDto,
    req: Request,
    res: Response,
  ): Promise<LoginResponse> {
    const { email, password } = loginDto;
    const user = await this.validate(email, password);

    const tokens = await this.tokenService.generateAndSetTokens(
      user.id,
      user.role,
      req.headers.origin,
    );

    res.cookie('accessToken', tokens.accessToken, tokens.accessOptions);
    res.cookie('refreshToken', tokens.refreshToken, tokens.refreshOptions);

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
      const cookieOptions = this.tokenService.getLogoutCookieOptions(
        req.headers.origin,
      );

      res.cookie('accessToken', '', cookieOptions.accessOptions);
      res.cookie('refreshToken', '', cookieOptions.refreshOptions);

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

  async sendVerificationEmail(
    sendVerificationEmailDto: SendVerificationEmailDto,
  ): Promise<{ success: boolean }> {
    return this.emailAuthService.sendVerificationEmail(
      sendVerificationEmailDto,
    );
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ verified: boolean; email: string }> {
    return this.emailAuthService.verifyEmail(verifyEmailDto);
  }

  async checkEmailVerification(email: string): Promise<boolean> {
    return this.emailAuthService.checkEmailVerification(email);
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

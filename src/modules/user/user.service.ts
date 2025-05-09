import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserSocialDto } from './dto/create-user-social.dto';
import { FilterService } from '../filter/filter.service';
import { FilteredUsersDto } from './dto/filtered-user.dto';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';
import { CursorPaginationUtil } from 'src/common/util/cursor-pagination.util';
import { RedisService } from '../redis/redis.service';
import { HashService } from '../auth/hash/hash.service';
import { UpdateDatingPreferenceDto } from '../dating-preference/dto/update-dating-preference.dto';
import { calculateAge } from 'src/common/util/age-calculator.util';
import { DataSource } from 'typeorm';
import { Mbti } from '../profile/mbti/entities/mbti.entity';
import { CreateFeedbackDto } from '../profile/feedback/dto/create-feedback.dto';
import { FeedbackService } from '../profile/feedback/common/feedback.service';
import { IntroductionService } from '../profile/introduction/common/introduction.service';
import { CreateIntroductionDto } from '../profile/introduction/dto/create-introduction.dto';
import { CreateInterestCategoryDto } from '../profile/interest-category/dto/create-interest-category.dto';
import { InterestCategoryService } from '../profile/interest-category/common/interest-category.service';
import { ProfileImageService } from '../profile/profile-image/profile-image.service';
import { ProfileImage } from '../profile/profile-image/entities/profile-image.entity';
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly filterService: FilterService,
    private readonly cursorPaginationUtil: CursorPaginationUtil,
    private readonly redisService: RedisService,
    private readonly hashService: HashService,
    private readonly dataSource: DataSource,
    private readonly feedbackService: FeedbackService,
    private readonly introductionService: IntroductionService,
    private readonly interestCategoryService: InterestCategoryService,
    private readonly profileImageService: ProfileImageService,
  ) {}

  // 사용자 생성
  createUser(createUserDto: CreateUserDto) {
    return this.userRepository.save(createUserDto);
  }

  // 사용자 업데이트
  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    // 닉네임 중복 체크 (본인 제외)
    if (updateUserDto.nickname) {
      const existingNickname = await this.findUserByNickname(
        updateUserDto.nickname,
      );
      if (existingNickname && existingNickname.id !== userId) {
        throw new BadRequestException('이미 존재하는 닉네임입니다.');
      }
    }
    // 전화번호 중복 체크 (본인 제외)
    if (updateUserDto.phone) {
      const existingPhone = await this.findUserByPhone(updateUserDto.phone);
      if (existingPhone && existingPhone.id !== userId) {
        throw new BadRequestException('이미 존재하는 전화번호입니다.');
      }
    }
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // 1. User와 Profile 연관관계 확인
      const user = await qr.manager.findOne(User, {
        where: { id: userId },
        relations: ['profile'],
      });
      if (!user || !user.profile?.id) {
        throw new NotFoundException('프로필을 찾을 수 없습니다.');
      }
      const profileId = user.profile.id;
      // 2. User 업데이트
      await qr.manager.update(
        User,
        { id: userId },
        {
          nickname: updateUserDto.nickname,
          name: updateUserDto.name,
          birthday: updateUserDto.birthday,
          gender: updateUserDto.gender,
          phone: updateUserDto.phone,
          region: updateUserDto.region,
          job: updateUserDto.job,
        },
      );
      // profileImage 업데이트
      if (updateUserDto.images?.length) {
        await this.updateUserProfileImages(userId, updateUserDto.images);
      }
      // 4. MBTI 저장
      if (updateUserDto.mbti?.[0]) {
        await qr.manager.save(Mbti, {
          mbti: updateUserDto.mbti[0],
          profile: { id: profileId },
        });
      }
      // 5. 피드백 저장
      if (updateUserDto.selfintro?.length) {
        await Promise.all(
          updateUserDto.selfintro.map(async (feedbackName) => {
            const existingFeedback =
              await this.feedbackService.searchFeedbacks(feedbackName);
            if (
              Array.isArray(existingFeedback) &&
              existingFeedback.length > 0
            ) {
              return existingFeedback[0];
            }
            const createDto: CreateFeedbackDto = { name: feedbackName };
            return this.feedbackService.createFeedbackCategory(createDto);
          }),
        );
      }
      // 6. 자기소개 저장
      if (updateUserDto.listening?.length) {
        await Promise.all(
          updateUserDto.listening.map(async (introductionName) => {
            const existingIntroduction =
              await this.introductionService.searchIntroductions(
                introductionName,
              );
            if (
              Array.isArray(existingIntroduction) &&
              existingIntroduction.length > 0
            ) {
              return existingIntroduction[0];
            }
            const createDto: CreateIntroductionDto = { name: introductionName };
            return this.introductionService.createIntroduction(createDto);
          }),
        );
      }
      // 7. 관심사 저장
      if (updateUserDto.interests?.length) {
        await Promise.all(
          updateUserDto.interests.map(async (interestName) => {
            const existingCategories =
              await this.interestCategoryService.searchInterestCategories(
                interestName,
              );
            if (
              Array.isArray(existingCategories) &&
              existingCategories.length > 0
            ) {
              return existingCategories[0];
            }
            const createDto: CreateInterestCategoryDto = { name: interestName };
            return this.interestCategoryService.createInterestCategory(
              createDto,
            );
          }),
        );
      }
      const isProfileComplete = this.isProfileDataComplete(updateUserDto);
      await qr.manager.update(User, { id: userId }, { isProfileComplete });
      await qr.commitTransaction();
      return { success: true };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  // 사용자 비밀번호 업데이트
  updateUserPassword(email: string, password: string) {
    return this.userRepository.update({ email }, { password });
  }

  async checkUserPassword(userId: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    return user?.password === password;
  }

  async getUserCoffee(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    return user?.coffee ? user.coffee : 0;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.findOne(userId);

    const isPasswordValid = await this.hashService.compare(
      oldPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }
    user.password = newPassword;
    await this.updateUserPassword(user.email, newPassword);
    return { message: '비밀번호 변경 성공' };
  }

  // 프로필 데이터 완료 여부 확인
  private isProfileDataComplete(data: UpdateUserDto): boolean {
    const requiredFields = [
      'nickname',
      'gender',
      'birthday',
      'phone',
      'region',
      'job',
    ];

    return requiredFields.every((field) => {
      const value = data[field as keyof UpdateUserDto];
      return value !== undefined && value !== null && value !== '';
    });
  }

  async findAllUsers() {
    const users = await this.userRepository.find();
    return users.map((user) => user.id);
  }

  // 모든 사용자 정보 조회
  async getAllUserInfo() {
    return this.userRepository.find({
      relations: [
        'profile',
        'profile.mbti',
        'profile.userIntroductions',
        'profile.userIntroductions.introduction',
        'profile.userFeedbacks',
        'profile.userFeedbacks.feedback',
        'profile.interestCategory',
        'profile.interestCategory.interestCategory',
        'profile.profileImage',
      ],
    });
  }

  // 커피 조회
  async getCoffeById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.coffee;
  }

  // 커피 업데이트
  async updateCoffee(userId: string, coffee: number) {
    return this.userRepository.update({ id: userId }, { coffee });
  }

  // 커피챗 사용자 조회
  async getCoffeeChatUserById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['coffeeChats', 'coffeeChatsReceived'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // 커피 구매
  async buyCoffee(userId: string, coffee: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.coffee += coffee;
    await this.userRepository.save(user);
    return { message: '커피 구매 성공' };
  }

  // 사용자 정보 조회
  async getUserInfo(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'profile',
        'profile.mbti',
        'profile.userIntroductions',
        'profile.userIntroductions.introduction',
        'profile.userFeedbacks',
        'profile.userFeedbacks.feedback',
        'profile.interestCategory',
        'profile.interestCategory.interestCategory',
        'profile.profileImage',
      ],
    });

    this.logger.debug(
      `user.profile.interestCategory: ${JSON.stringify(
        user?.profile?.interestCategory,
      )}`,
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const age = calculateAge(user.birthday);

    return {
      nickname: user?.nickname,
      job: user?.job,
      height: user?.height,
      age,
      mbti: user?.profile?.mbti,
      likeCount: user?.likeCount,
      profileImage: user?.profile?.profileImage[0]?.imageUrl,
      userFeedbacks: user?.profile?.userFeedbacks.map(
        (feedback) => feedback.feedback.name,
      ),
      userIntroductions: user?.profile?.userIntroductions.map(
        (introduction) => introduction.introduction.name,
      ),
      interestCategory: user?.profile?.interestCategory.map(
        (interest) => interest.interestCategory.name,
      ),
    };
  }

  // 소셜 사용자 생성
  async createSocialUser(
    createUserSocialDto: CreateUserSocialDto,
  ): Promise<User> {
    const timestamp = Date.now();

    const socialUser = {
      ...createUserSocialDto,
      password: `SOCIAL_LOGIN_${timestamp}`,
      nickname: `닉네임을 입력해주세요`,
      isProfileComplete: false,
    };

    return this.userRepository.save(socialUser);
  }

  // 프로필 완성 상태 업데이트
  async completeUserProfile(id: string, updateData: UpdateUserDto) {
    const isComplete = this.isProfileDataComplete(updateData);

    if (!isComplete) {
      throw new BadRequestException('모든 필수 정보를 입력해야 합니다.');
    }

    // 프로필 완성 상태 추가
    const data = {
      ...updateData,
      isProfileComplete: true,
    };

    await this.userRepository.update({ id }, data);
    return this.findOne(id);
  }

  // ID로 사용자 조회
  async findUserById(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    return user;
  }

  // 이메일로 사용자 조회
  async findUserByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
    return user;
  }

  // 이메일, 이름, 전화번호로 사용자 조회
  async findUserByEmailAndNameAndPhone(
    email: string,
    name: string,
    phone: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { email, name, phone },
    });
    return user;
  }

  // 이름과 전화번호로 사용자 조회
  async findUserByNameAndPhone(name: string, phone: string) {
    const user = await this.userRepository.findOne({
      where: { name, phone },
    });
    return user;
  }

  // 이름으로 사용자 조회
  async findUserByName(name: string) {
    const user = await this.userRepository.findOne({ where: { name } });
    return user;
  }

  // 닉네임으로 사용자 조회
  async findUserByNickname(nickname: string) {
    const user = await this.userRepository.findOne({ where: { nickname } });
    return user;
  }

  // 전화번호로 사용자 조회
  async findUserByPhone(phone: string) {
    const user = await this.userRepository.findOne({ where: { phone } });
    return user;
  }

  // 사용자 조회
  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
        'profile',
        'profile.mbti',
        'profile.userIntroductions',
        'profile.userIntroductions.introduction',
        'profile.userFeedbacks',
        'profile.userFeedbacks.feedback',
        'profile.interestCategory',
        'profile.interestCategory.interestCategory',
        'profile.profileImage',
      ],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // 사용자 저장
  async saveUser(userName: string, socketId: string) {
    const user = this.userRepository.create({
      nickname: userName,
      socketId,
    });
    return this.userRepository.save(user);
  }

  // 데이팅 프리퍼런스 조회
  async getDatingPreference(
    currentUserId: string,
    datingPreferenceDto: UpdateDatingPreferenceDto,
    cursorPaginationDto: CursorPaginationDto,
  ): Promise<{ users: User[]; nextCursor: string | null }> {
    this.logger.debug(
      `데이팅 프리퍼런스 조회 시작 - 현재 사용자: ${currentUserId}, 데이팅 프리퍼런스: ${JSON.stringify(
        datingPreferenceDto,
      )}`,
    );
    const currentUser = await this.findOne(currentUserId);
    const { ageMin, ageMax, heightMin, heightMax, region } =
      datingPreferenceDto;
    const today = new Date();

    const qb = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.nickname',
        'user.birthday',
        'user.height',
        'user.region',
        'user.gender',
        'user.likeCount',
      ])
      .where('user.id != :userId', { userId: currentUserId })
      .andWhere('user.deletedAt IS NULL')
      .andWhere('user.gender != :gender', { gender: currentUser.gender });

    if (ageMin) {
      const maxBirthYear = today.getFullYear() - ageMin;
      qb.andWhere(
        'CAST(SUBSTRING(user.birthday, 1, 4) AS INTEGER) <= :maxBirthYear',
        { maxBirthYear },
      );
    }

    if (ageMax) {
      const minBirthYear = today.getFullYear() - ageMax;
      qb.andWhere(
        'CAST(SUBSTRING(user.birthday, 1, 4) AS INTEGER) >= :minBirthYear',
        { minBirthYear },
      );
    }

    if (heightMin) {
      qb.andWhere('user.height >= :heightMin', { heightMin });
    }

    if (heightMax) {
      qb.andWhere('user.height <= :heightMax', { heightMax });
    }

    if (region) {
      qb.andWhere('user.region = :region', { region });
    }

    const { nextCursor } =
      await this.cursorPaginationUtil.applyCursorPaginationParamsToQb(qb, {
        cursor: cursorPaginationDto.cursor,
        order: cursorPaginationDto.order,
        take: cursorPaginationDto.take,
      });

    const users = await qb.getMany();

    return { users, nextCursor };
  }

  // 필터링된 사용자 조회
  async getFilteredUsers(
    currentUserId: string,
    filteredUsersDto: FilteredUsersDto,
    cursorPaginationDto: CursorPaginationDto,
  ): Promise<{ users: User[]; nextCursor: string | null }> {
    this.logger.debug(
      `필터링된 사용자 조회 시작 - 현재 사용자: ${currentUserId}, 필터: ${JSON.stringify(
        filteredUsersDto,
      )}`,
    );

    const { ageMin, ageMax, minLikes, region } = filteredUsersDto;
    const today = new Date();

    const currentUser = await this.findOne(currentUserId);

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('profile.profileImage', 'profileImage')
      .select([
        'user.id',
        'user.nickname',
        'user.birthday',
        'user.gender',
        'user.likeCount',
        'user.region',
        'profile.id',
        'profileImage.id',
        'profileImage.imageUrl',
      ])
      .where('user.id != :userId', { userId: currentUserId })
      .andWhere('user.deletedAt IS NULL')
      .andWhere('user.gender = :gender', {
        gender: currentUser.gender === '남자' ? '여자' : '남자',
      });

    if (region) {
      qb.andWhere('user.region = :region', { region });
    }

    if (ageMin) {
      const maxBirthYear = today.getFullYear() - ageMin;
      qb.andWhere(
        'CAST(SUBSTRING(user.birthday, 1, 4) AS INTEGER) <= :maxBirthYear',
        { maxBirthYear },
      );
    }

    if (ageMax) {
      const minBirthYear = today.getFullYear() - ageMax;
      qb.andWhere(
        'CAST(SUBSTRING(user.birthday, 1, 4) AS INTEGER) >= :minBirthYear',
        { minBirthYear },
      );
    }

    if (minLikes) {
      qb.andWhere('user.likeCount >= :minLikes', { minLikes });
    }

    const { nextCursor } =
      await this.cursorPaginationUtil.applyCursorPaginationParamsToQb(qb, {
        cursor: cursorPaginationDto.cursor,
        order: cursorPaginationDto.order,
        take: cursorPaginationDto.take,
      });

    const users = await qb.getMany();

    this.logger.debug(
      `쿼리 결과 유저 목록: ${users
        .map((u) => `id: ${u.id}, gender: ${u.gender}`)
        .join(', ')} `,
    );

    return { users, nextCursor };
  }

  //회원목록 유저 찾기
  async getUserList(dto: CursorPaginationDto) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('profile.profileImage', 'profileImage')
      .select([
        'user.id',
        'user.nickname',
        'user.region',
        'user.likeCount',
        'user.birthday',
        'profile.id',
        'profileImage.id',
        'profileImage.imageUrl',
      ])
      .where('user.deletedAt IS NULL')
      .orderBy('user.likeCount', 'DESC')
      .addOrderBy('user.id', 'ASC')
      .take(6);

    const { nextCursor } =
      await this.cursorPaginationUtil.applyCursorPaginationParamsToQb(qb, dto);

    const [users, totalCount] = await qb.getManyAndCount();

    return { users, nextCursor, totalCount };
  }

  // 프로필 이미지 메인 설정
  async updateUserProfileImage(userId: string, imageId: string) {
    this.logger.log(
      `프로필 이미지 메인 설정 시작 - userId: ${userId}, imageId: ${imageId}`,
    );
    // 1. userId로 profileId 조회
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
    if (!user || !user.profile?.id) {
      throw new NotFoundException('프로필을 찾을 수 없습니다.');
    }
    const profileId = user.profile.id;
    // 2. ProfileImageService로 메인 이미지 설정
    const updatedImage = await this.profileImageService.setMainImage(
      profileId,
      imageId,
    );
    this.logger.log(
      `프로필 이미지 메인 설정 완료 - profileId: ${profileId}, imageId: ${imageId}`,
    );
    return updatedImage;
  }

  async updateUserProfileImages(userId: string, imageUrls: string[]) {
    this.logger.log(`프로필 이미지 업데이트 시작 - userId: ${userId}`);

    // 트랜잭션 시작
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // 1. userId로 profileId 및 기존 이미지 조회
      const user = await qr.manager.findOne(User, {
        where: { id: userId },
        relations: ['profile', 'profile.profileImage'],
      });
      if (!user || !user.profile?.id) {
        throw new NotFoundException('프로필을 찾을 수 없습니다.');
      }
      const profileId = user.profile.id;
      const existingImages = user.profile.profileImage || [];

      // 2. 기존 이미지와 새 이미지 비교 (key 기준)
      const existingKeys = existingImages.map((img) => img.key);
      // 새로 추가된 이미지: temp url만 있는 경우(즉, 기존 key에 없는 경우)
      const toAdd = imageUrls.filter((url) => {
        // temp url은 key가 없음, 기존 key와 매칭 안됨
        return !existingImages.some(
          (img) => img.imageUrl === url || img.key === url,
        );
      });
      // 삭제할 이미지: 기존에 있는데 새 배열에 없는 경우
      const toRemove = existingImages.filter(
        (img) =>
          !imageUrls.includes(img.imageUrl) && !imageUrls.includes(img.key),
      );

      // 3. 삭제
      for (const img of toRemove) {
        await this.profileImageService.deleteProfileImage(img.id);
      }

      // 4. 추가 (S3 이동 및 DB 저장)
      const log = (msg: string) => this.logger.log(msg);
      const newImageEntities =
        await this.profileImageService.processImagesInChunks(
          toAdd,
          profileId,
          log,
        );
      if (newImageEntities.length > 0) {
        await qr.manager.save(newImageEntities);
      }

      // 5. 메인 이미지 처리
      if (imageUrls.length > 0) {
        // imageUrls[0]에 해당하는 imageUrl 또는 key를 가진 이미지를 메인으로
        const mainImage = await qr.manager.findOne(ProfileImage, {
          where: [
            { profile: { id: profileId }, imageUrl: imageUrls[0] },
            { profile: { id: profileId }, key: imageUrls[0] },
          ],
        });
        if (mainImage) {
          await this.profileImageService.setMainImage(profileId, mainImage.id);
        }
      }

      await qr.commitTransaction();
      this.logger.log(`프로필 이미지 업데이트 완료 - userId: ${userId}`);
      return { success: true };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }
}

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
  ) {}

  // 사용자 생성
  createUser(createUserDto: CreateUserDto) {
    return this.userRepository.save(createUserDto);
  }

  // 사용자 업데이트
  updateUser(id: string, updateUserDto: UpdateUserDto) {
    const isProfileComplete = this.isProfileDataComplete(updateUserDto);

    const data = {
      ...updateUserDto,
      isProfileComplete,
    };

    return this.userRepository.update({ id }, data);
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

  // 이메일로 사용자 조회
  async findUserByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
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

    const { ageMin, ageMax, minLikes } = filteredUsersDto;
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
}

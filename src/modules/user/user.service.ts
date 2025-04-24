import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
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
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly filterService: FilterService,
    private readonly cursorPaginationUtil: CursorPaginationUtil,
    private readonly redisService: RedisService,
  ) {}

  createUser(createUserDto: CreateUserDto) {
    return this.userRepository.save(createUserDto);
  }

  updateUser(id: string, updateUserDto: UpdateUserDto) {
    const isProfileComplete = this.isProfileDataComplete(updateUserDto);

    const data = {
      ...updateUserDto,
      isProfileComplete,
    };

    return this.userRepository.update({ id }, data);
  }

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

  async getAllUserInfo() {
    return this.userRepository.find({
      relations: [
        'profile',
        'profile.mbti',
        'profile.userIntroductions',
        'profile.userFeedbacks',
        'profile.interestCategory',
        'profile.profileImage',
      ],
    });
  }

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

  async getUserInfo(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'profile',
        'profile.mbti',
        'profile.userIntroductions',
        'profile.userFeedbacks',
        'profile.interestCategory',
        'profile.profileImage',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async createSocialUser(
    createUserSocialDto: CreateUserSocialDto,
  ): Promise<User> {
    const timestamp = Date.now();

    const socialUser = {
      ...createUserSocialDto,
      password: `SOCIAL_LOGIN_${timestamp}`, //소셜 로그인 임시 비밀번호
      nickname: `닉네임을 입력해주세요`, // 임시 닉네임 생성
      isProfileComplete: false, // 프로필 미완성 상태로 시작
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

  findUserByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
  }

  findUserByNickname(nickname: string) {
    return this.userRepository.findOne({ where: { nickname } });
  }

  async findOne(id: string) {
    return this.userRepository.findOne({
      where: { id },
      relations: [
        'profile',
        'profile.mbti',
        'profile.userIntroductions',
        'profile.userFeedbacks',
        'profile.interestCategory',
        'profile.profileImage',
      ],
    });
  }

  async saveUser(userName: string, socketId: string) {
    const user = this.userRepository.create({
      nickname: userName,
      socketId,
    });
    return this.userRepository.save(user);
  }

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
    if (!currentUser) {
      this.logger.error(`현재 사용자를 찾을 수 없음: ${currentUserId}`);
      throw new NotFoundException('현재 사용자를 찾을 수 없습니다.');
    }

    const qb = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.nickname',
        'user.birthday',
        'user.gender',
        'user.likeCount',
      ])
      .where('user.id != :userId', { userId: currentUserId })
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

    return { users, nextCursor };
  }

  //회원목록 유저 찾기
  async getUserList(dto: CursorPaginationDto) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.nickname', 'user.region', 'user.likeCount'])
      .where('user.deletedAt IS NULL');

    const { nextCursor } =
      await this.cursorPaginationUtil.applyCursorPaginationParamsToQb(qb, dto);

    const [users, totalCount] = await qb.getManyAndCount();

    return { users, nextCursor, totalCount };
  }

  // 페이징 처리로 모든 사용자 정보 가져오기
  async getAllUserInfoWithPagination(
    page: number = 1,
    pageSize: number = 100,
  ): Promise<{ users: User[]; total: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      relations: [
        'profile',
        'profile.mbti',
        'profile.interestCategory',
        'profile.interestCategory.interestCategory',
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { users, total };
  }
}

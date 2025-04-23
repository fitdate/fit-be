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
import { UserWithScore } from '../filter/types/user-with-score.type';
import { FilteredUsersDto } from './dto/filtered-user.dto';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';
import { CursorPaginationUtil } from 'src/common/util/cursor-pagination.util';
import { RedisService } from '../redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
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
  ): Promise<UserWithScore[]> {
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

    const query = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.nickname',
        'user.birthday',
        'user.gender',
        'user.region',
        'user.job',
        'user.likeCount',
        'profile.id',
        'mbti.mbti',
        'profileImages.imageUrl',
        'profileImages.isMain',
        'userIntroductions.id',
        'userIntroductions.introduction',
        'userFeedbacks.id',
        'userFeedbacks.feedback',
        'interestCategory.id',
        'interestCategory.category',
      ])
      .leftJoin('user.profile', 'profile')
      .leftJoin('profile.mbti', 'mbti')
      .leftJoin('profile.userIntroductions', 'userIntroductions')
      .leftJoin('userIntroductions.introduction', 'introduction')
      .leftJoin('profile.userFeedbacks', 'userFeedbacks')
      .leftJoin('userFeedbacks.feedback', 'feedback')
      .leftJoin('profile.interestCategory', 'interestCategory')
      .leftJoin('interestCategory.category', 'category')
      .where('user.id != :userId', { userId: currentUserId })
      .andWhere('user.gender != :gender', { gender: currentUser.gender })
      .andWhere('user.isProfileComplete = :isComplete', { isComplete: true });

    if (ageMin) {
      const maxBirthYear = today.getFullYear() - ageMin;
      this.logger.debug(`최대 출생연도 필터 적용: ${maxBirthYear}`);
      query.andWhere(
        'CAST(SUBSTRING(user.birthday, 1, 4) AS INTEGER) <= :maxBirthYear',
        { maxBirthYear },
      );
    }

    if (ageMax) {
      const minBirthYear = today.getFullYear() - ageMax;
      this.logger.debug(`최소 출생연도 필터 적용: ${minBirthYear}`);
      query.andWhere(
        'CAST(SUBSTRING(user.birthday, 1, 4) AS INTEGER) >= :minBirthYear',
        { minBirthYear },
      );
    }

    if (minLikes) {
      this.logger.debug(`최소 좋아요 수 필터 적용: ${minLikes}`);
      query.andWhere('user.likeCount >= :minLikes', { minLikes });
    }

    const users = await query.getMany();
    this.logger.debug(`필터링된 사용자 수: ${users.length}`);

    const usersWithScores = this.filterService.addCompatibilityScores(
      users,
      currentUser,
    );
    this.logger.debug(`호환성 점수 계산 완료`);

    return usersWithScores;
  }

  //회원목록 유저 찾기
  async getUserList(dto: CursorPaginationDto) {
    this.logger.debug(`getUserList 시작 - dto: ${JSON.stringify(dto)}`);

    const seed = dto.seed || uuidv4();
    this.logger.debug(`사용된 seed: ${seed}`);

    const cacheKey = `userList:${seed}:${dto.order.join('_')}:${dto.take}`;
    this.logger.debug(`캐시 키: ${cacheKey}`);

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.debug('캐시에서 데이터를 가져왔습니다');
      return JSON.parse(cached) as {
        users: User[];
        nextCursor: string;
        totalCount: number;
      };
    }
    this.logger.debug('캐시에 데이터가 없어 DB에서 조회합니다');

    const qb = this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.nickname', 'user.region', 'user.likeCount']);

    qb.where('"user"."seed" LIKE :seed', { seed: `${seed}%` });
    qb.orderBy('"user"."seed"', 'ASC');

    this.logger.debug(`생성된 쿼리: ${qb.getQuery()}`);
    this.logger.debug(`쿼리 파라미터: ${JSON.stringify(qb.getParameters())}`);

    const { nextCursor } =
      await this.cursorPaginationUtil.applyCursorPaginationParamsToQb(qb, dto);
    this.logger.debug(`다음 커서: ${nextCursor}`);

    const [users, totalCount] = await qb.getManyAndCount();
    this.logger.debug(
      `조회된 사용자 수: ${users.length}, 전체 수: ${totalCount}`,
    );

    const result = { users, nextCursor, totalCount };
    const cacheTtl = 300;
    await this.redisService.set(cacheKey, JSON.stringify(result), cacheTtl);
    this.logger.debug(`결과를 캐시에 저장했습니다. TTL: ${cacheTtl}초`);

    return result;
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

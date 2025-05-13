import { Injectable, Logger } from '@nestjs/common';
import { UpdateDatingPreferenceDto } from './dto/update-dating-preference.dto';
import { DatingPreference } from './entities/dating-preference.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { calculateAge } from 'src/common/util/age-calculator.util';
import { User } from '../user/entities/user.entity';
import {
  DatingPreferenceDto,
  DatingPreferenceListResponse,
  UserProfileResponse,
} from './types/dating-prefrence.interface';

@Injectable()
export class DatingPreferenceService {
  private readonly logger = new Logger(DatingPreferenceService.name);
  private readonly DEFAULT_AGE_MIN = 20;
  private readonly DEFAULT_AGE_MAX = 50;
  private readonly DEFAULT_HEIGHT_MIN = 150;
  private readonly DEFAULT_HEIGHT_MAX = 195;
  private readonly DEFAULT_PAGE_SIZE = 6;

  constructor(
    @InjectRepository(DatingPreference)
    private readonly datingPreferenceRepository: Repository<DatingPreference>,
    private readonly userService: UserService,
  ) {}

  // 사용자의 데이팅 선호 조건을 조회
  async getDatingPreference(userId: string): Promise<DatingPreference | null> {
    this.logger.debug(
      `사용자 ${userId}의 데이팅 프리퍼런스 설정을 조회합니다.`,
    );

    const datingPreference = await this.datingPreferenceRepository.findOne({
      where: { user: { id: userId } },
    });

    this.logger.debug(
      `조회된 데이팅 프리퍼런스 설정: ${JSON.stringify(datingPreference)}`,
    );

    return datingPreference;
  }

  // 사용자의 데이팅 선호 조건에 맞는 사용자 목록을 조회
  async getDatingPreferenceList(
    userId: string,
  ): Promise<DatingPreferenceListResponse> {
    const datingPreference = await this.getDatingPreference(userId);
    const datingPreferenceDto =
      this.createDatingPreferenceDto(datingPreference);

    this.logger.debug(
      `사용자 ${userId}의 데이팅 프리퍼런스 설정: ${JSON.stringify(datingPreferenceDto)}`,
    );

    const { users, nextCursor } = await this.userService.getDatingPreference(
      userId,
      datingPreferenceDto,
      {
        cursor: null,
        order: ['createdAt_ASC'],
        take: this.DEFAULT_PAGE_SIZE,
      },
    );

    return {
      users: this.mapUsersToProfileResponse(users),
      nextCursor,
    };
  }

  // 사용자의 데이팅 선호 조건을 업데이트
  async updateDatingPreference(
    userId: string,
    updateDatingPreferenceDto: UpdateDatingPreferenceDto,
  ): Promise<DatingPreference> {
    this.logger.debug(
      `사용자 ${userId}의 데이팅 프리퍼런스 설정을 업데이트합니다.`,
    );

    const datingPreference = await this.findOrCreateDatingPreference(
      userId,
      updateDatingPreferenceDto,
    );

    const result = await this.datingPreferenceRepository.save(datingPreference);

    this.logger.debug(
      `업데이트된 데이팅 프리퍼런스 설정: ${JSON.stringify(result)}`,
    );

    return result;
  }

  // 데이팅 선호 조건 DTO를 생성
  private createDatingPreferenceDto(
    datingPreference: DatingPreference | null,
  ): DatingPreferenceDto {
    return {
      ageMin: datingPreference?.ageMin ?? this.DEFAULT_AGE_MIN,
      ageMax: datingPreference?.ageMax ?? this.DEFAULT_AGE_MAX,
      heightMin: datingPreference?.heightMin ?? this.DEFAULT_HEIGHT_MIN,
      heightMax: datingPreference?.heightMax ?? this.DEFAULT_HEIGHT_MAX,
      region: datingPreference?.region,
    };
  }

  // 사용자 목록을 프로필 응답 형식으로 변환
  private mapUsersToProfileResponse(users: User[]): UserProfileResponse[] {
    return users.map((user) => ({
      id: user.id,
      nickname: user.nickname,
      region: user.region ?? '',
      height: user.height,
      age: calculateAge(user.birthday),
      likeCount: user.likeCount,
      profileImageId: user.profile.profileImage[0].id,
      profileImageUrl: user.profile.profileImage[0].imageUrl,
    }));
  }

  // 기존 데이팅 선호 조건을 찾거나 새로운 것을 생성
  private async findOrCreateDatingPreference(
    userId: string,
    updateDto: UpdateDatingPreferenceDto,
  ): Promise<DatingPreference> {
    let datingPreference = await this.datingPreferenceRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!datingPreference) {
      this.logger.debug('새로운 데이팅 프리퍼런스 설정을 생성합니다.');
      datingPreference = this.datingPreferenceRepository.create({
        ...updateDto,
        user: { id: userId },
      });
    } else {
      this.logger.debug('기존 데이팅 프리퍼런스 설정을 업데이트합니다.');
      Object.assign(datingPreference, updateDto);
    }

    return datingPreference;
  }
}

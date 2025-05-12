import { Injectable } from '@nestjs/common';
import { UpdateDatingPreferenceDto } from './dto/update-dating-preference.dto';
import { DatingPreference } from './entities/dating-preference.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { calculateAge } from 'src/common/util/age-calculator.util';
@Injectable()
export class DatingPreferenceService {
  private readonly logger = new Logger(DatingPreferenceService.name);
  constructor(
    @InjectRepository(DatingPreference)
    private readonly datingPreferenceRepository: Repository<DatingPreference>,
    private readonly userService: UserService,
  ) {}

  // 데이팅 선호 조건 조회
  async getDatingPreference(userId: string) {
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

  // 데이팅 선호 조건 목록 조회
  async getDatingPreferenceList(userId: string) {
    const datingPreference = await this.getDatingPreference(userId);
    const datingPreferenceDto = {
      ageMin: datingPreference?.ageMin ?? 20,
      ageMax: datingPreference?.ageMax ?? 50,
      heightMin: datingPreference?.heightMin ?? 150,
      heightMax: datingPreference?.heightMax ?? 195,
      region: datingPreference?.region,
    };
    this.logger.debug(
      `사용자 ${userId}의 데이팅 프리퍼런스 설정: ${JSON.stringify(datingPreferenceDto)}`,
    );
    const { users, nextCursor } = await this.userService.getDatingPreference(
      userId,
      datingPreferenceDto,
      {
        cursor: null,
        order: ['createdAt_ASC'],
        take: 6,
      },
    );
    return {
      users: users.map((user) => ({
        id: user.id,
        nickname: user.nickname,
        region: user.region,
        height: user.height,
        age: calculateAge(user.birthday),
        likeCount: user.likeCount,
        profileImageId: user.profile.profileImage[0].id,
        profileImageUrl: user.profile.profileImage[0].imageUrl,
      })),
      nextCursor,
    };
  }

  // 데이팅 선호 조건 업데이트
  async updateDatingPreference(
    userId: string,
    updateDatingPreferenceDto: UpdateDatingPreferenceDto,
  ) {
    this.logger.debug(
      `사용자 ${userId}의 데이팅 프리퍼런스 설정을 업데이트합니다.`,
    );
    let datingPreference = await this.datingPreferenceRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!datingPreference) {
      this.logger.debug('새로운 데이팅 프리퍼런스 설정을 생성합니다.');
      datingPreference = this.datingPreferenceRepository.create({
        ...updateDatingPreferenceDto,
        user: { id: userId },
      });
    } else {
      this.logger.debug('기존 데이팅 프리퍼런스 설정을 업데이트합니다.');
      Object.assign(datingPreference, updateDatingPreferenceDto);
    }
    const result = await this.datingPreferenceRepository.save(datingPreference);
    this.logger.debug(
      `업데이트된 데이팅 프리퍼런스 설정: ${JSON.stringify(result)}`,
    );
    return result;
  }
}

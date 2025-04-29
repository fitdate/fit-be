import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { MatchSelection } from './entities/match-selection.entity';
import { calculateAge } from '../../common/util/age-calculator.util';
import {
  MatchResultResponseDto,
  MatchResultUserDto,
} from './dto/match-result.dto';

@Injectable()
export class MatchResultService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MatchSelection)
    private readonly matchSelectionRepository: Repository<MatchSelection>,
  ) {}

  // 사용자의 매칭 결과를 페이지네이션과 함께 조회
  async getMatchResults(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: MatchResultResponseDto[]; total: number }> {
    try {
      const [matches, total] = await this.matchSelectionRepository
        .createQueryBuilder('match')
        .leftJoinAndSelect('match.selector', 'selector')
        .leftJoinAndSelect('selector.profile', 'selectorProfile')
        .leftJoinAndSelect(
          'selectorProfile.profileImage',
          'selectorProfileImage',
        )
        .leftJoinAndSelect('match.selected', 'selected')
        .leftJoinAndSelect('selected.profile', 'selectedProfile')
        .leftJoinAndSelect(
          'selectedProfile.profileImage',
          'selectedProfileImage',
        )
        .where('match.userId = :userId OR match.partnerId = :userId', {
          userId,
        })
        .orderBy('match.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      const results = matches.map((match) => {
        if (!match.selector || !match.selected) {
          return null;
        }

        return {
          currentUser: this.formatUserProfile(match.selector),
          selectedUser: this.formatUserProfile(match.selected),
        };
      });

      const validResults = results.filter(
        (result): result is MatchResultResponseDto => result !== null,
      );

      return {
        data: validResults,
        total,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        '매칭 결과 조회 중 오류가 발생했습니다.',
        (error as Error).stack,
      );
    }
  }

  // 사용자 프로필 정보를 응답 형식에 맞게 변환
  private formatUserProfile(user: User): MatchResultUserDto {
    const mainImage = user.profile?.profileImage?.find((img) => img.isMain);
    const firstImage = user.profile?.profileImage?.[0];
    const profileImage = mainImage?.imageUrl || firstImage?.imageUrl || '';

    return {
      id: user.id,
      nickname: user.nickname,
      likeCount: user.likeCount,
      age: calculateAge(user.birthday),
      region: user.region || '',
      profileImage,
    };
  }
}

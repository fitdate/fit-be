import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
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
  private readonly logger = new Logger(MatchResultService.name);

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
      this.logger.log(
        `[getMatchResults] 사용자 ID: ${userId}, 페이지: ${page}, 페이지당 항목 수: ${limit}`,
      );

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

      this.logger.log(
        `[getMatchResults] 조회된 매칭 수: ${matches.length}, 전체 매칭 수: ${total}`,
      );

      const results = matches.map((match) => {
        if (!match.selector || !match.selected) {
          this.logger.warn(
            `[getMatchResults] 매칭 정보 누락 - 매칭 ID: ${match.id}`,
          );
          return null;
        }

        // 현재 사용자가 매칭 신청자인 경우
        const isSelector = match.selector.id === userId;
        const currentUser = isSelector ? match.selector : match.selected;
        const selectedUser = isSelector ? match.selected : match.selector;

        // 매칭 결과는 양쪽 모두의 상태를 고려
        // 신청자가 true이고 수신자가 수락한 경우에만 true
        const isSuccess = match.isSuccess;

        this.logger.log(
          `[getMatchResults] 매칭 정보 - ID: ${match.id}, ` +
            `신청자: ${match.selector.nickname}, ` +
            `수신자: ${match.selected.nickname}, ` +
            `현재 사용자 역할: ${isSelector ? '신청자' : '수신자'}, ` +
            `매칭 성공 여부: ${isSuccess}`,
        );

        return {
          currentUser: this.formatUserProfile(currentUser),
          selectedUser: this.formatUserProfile(selectedUser),
          isSuccess,
        };
      });

      const validResults = results.filter(
        (result): result is MatchResultResponseDto => result !== null,
      );

      this.logger.log(
        `[getMatchResults] 유효한 매칭 결과 수: ${validResults.length}`,
      );

      return {
        data: validResults,
        total,
      };
    } catch (error) {
      this.logger.error(
        `[getMatchResults] 매칭 결과 조회 중 오류 발생: ${(error as Error).message}`,
        (error as Error).stack,
      );
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

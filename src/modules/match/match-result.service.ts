import {
  Injectable,
  Logger,
  InternalServerErrorException,
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

  /**
   * 특정 사용자의 매칭 결과를 조회합니다.
   */
  async getMatchResults(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: MatchResultResponseDto[]; total: number }> {
    try {
      this.logger.log(
        `사용자(${userId})의 매칭 결과 조회 시작 - 페이지: ${page}, 페이지당 항목 수: ${limit}`,
      );

      const [matches, total] = await this.matchSelectionRepository.findAndCount(
        {
          where: [{ selector: { id: userId } }, { selected: { id: userId } }],
          relations: [
            'selector',
            'selector.profile',
            'selector.profile.profileImage',
            'selected',
            'selected.profile',
            'selected.profile.profileImage',
          ],
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        },
      );

      this.logger.log(
        `매칭 결과 조회 완료 - 총 ${total}개의 결과 중 ${matches.length}개 조회`,
      );

      const results = matches.map((match) => {
        if (!match.selector || !match.selected) {
          this.logger.warn(`매칭 데이터 누락 - 매칭 ID: ${match.id}`);
          return null;
        }

        try {
          return {
            currentUser: this.formatUserProfile(match.selector),
            selectedUser: this.formatUserProfile(match.selected),
          };
        } catch (error) {
          this.logger.error(
            `사용자 프로필 포맷팅 중 오류 발생 - 매칭 ID: ${match.id}, 오류: ${(error as Error).message}`,
          );
          return null;
        }
      });

      const validResults = results.filter(
        (result): result is MatchResultResponseDto => result !== null,
      );

      this.logger.log(
        `매칭 결과 처리 완료 - 유효한 결과: ${validResults.length}/${matches.length}`,
      );

      return {
        data: validResults,
        total,
      };
    } catch (error) {
      this.logger.error(
        `매칭 결과 조회 중 오류 발생: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        '매칭 결과 조회 중 오류가 발생했습니다.',
      );
    }
  }

  private formatUserProfile(user: User): MatchResultUserDto {
    try {
      return {
        id: user.id,
        nickname: user.nickname,
        likeCount: user.likeCount,
        age: calculateAge(user.birthday),
        region: user.region || '',
        profileImage: user.profile?.profileImage?.[0]?.imageUrl || '',
      };
    } catch (error) {
      this.logger.error(
        `사용자 프로필 포맷팅 중 오류 발생 - 사용자 ID: ${user.id}, 오류: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}

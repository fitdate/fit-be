import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileService } from '../profile/profile.service';
import { Profile } from '../profile/entities/profile.entity';
import { Match } from './entities/match.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    private readonly profileService: ProfileService,
  ) {}

  private calculateSimilarity(profile1: Profile, profile2: Profile): number {
    let similarity = 0;

    // MBTI 유사도
    if (profile1.mbti && profile2.mbti) {
      if (profile1.mbti.type === profile2.mbti.type) {
        similarity += 30;
      }
    }

    // 관심 카테고리 유사도
    if (profile1.interestCategory && profile2.interestCategory) {
      const categories1 = Array.isArray(profile1.interestCategory)
        ? profile1.interestCategory.map((cat) => cat.interestCategory.name)
        : [];
      const categories2 = Array.isArray(profile2.interestCategory)
        ? profile2.interestCategory.map((cat) => cat.interestCategory.name)
        : [];
      const commonCategories = categories1.filter((cat) =>
        categories2.includes(cat),
      );
      similarity +=
        (commonCategories.length /
          Math.max(categories1.length, categories2.length)) *
        30;
    }

    // 직업 유사도
    if (profile1.job === profile2.job) {
      similarity += 20;
    }

    // 피드백 유사도
    if (profile1.userFeedbacks && profile2.userFeedbacks) {
      const feedback1 = Array.isArray(profile1.userFeedbacks)
        ? profile1.userFeedbacks.map((fb) => fb.feedback || '').join(' ')
        : '';
      const feedback2 = Array.isArray(profile2.userFeedbacks)
        ? profile2.userFeedbacks.map((fb) => fb.feedback || '').join(' ')
        : '';
      const commonWords = feedback1
        .split(' ')
        .filter((word) => feedback2.includes(word));
      similarity +=
        (commonWords.length /
          Math.max(feedback1.split(' ').length, feedback2.split(' ').length)) *
        20;
    }

    return similarity;
  }

  async findRandomMatches(userId: string): Promise<{
    matches: { matchId: string; user1: Profile; user2: Profile }[];
  }> {
    // 현재 사용자의 프로필 가져오기
    const currentProfile = await this.profileService.getProfileByUserId(userId);

    // 모든 프로필 가져오기 (현재 사용자 제외)
    const allProfiles = await this.profileService.findAll();
    const otherProfiles = allProfiles.filter(
      (profile) => profile.user.id !== userId,
    );

    // 유사도 계산 및 정렬
    const profilesWithSimilarity = otherProfiles
      .map((profile) => ({
        profile,
        similarity: this.calculateSimilarity(currentProfile, profile),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    // 상위 4개 프로필 선택
    const topProfiles = profilesWithSimilarity
      .slice(0, 4)
      .map((item) => item.profile);

    // 2명씩 매칭
    const matches = [];
    for (let i = 0; i < topProfiles.length; i += 2) {
      if (i + 1 < topProfiles.length) {
        const matchId = uuidv4();
        const match = await this.create({
          matchId,
          user1Id: topProfiles[i].user.id,
          user2Id: topProfiles[i + 1].user.id,
        });
        matches.push({
          matchId,
          user1: topProfiles[i],
          user2: topProfiles[i + 1],
        });
      }
    }

    return { matches };
  }

  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    const match = this.matchRepository.create({
      matchId: createMatchDto.matchId,
      user1: { id: createMatchDto.user1Id },
      user2: { id: createMatchDto.user2Id },
    });
    return this.matchRepository.save(match);
  }

  async findAll(): Promise<Match[]> {
    return this.matchRepository.find({
      relations: ['user1', 'user2'],
    });
  }

  async findOne(id: string): Promise<Match | null> {
    return this.matchRepository.findOne({
      where: { id },
      relations: ['user1', 'user2'],
    });
  }

  async findByMatchId(matchId: string): Promise<Match | null> {
    return this.matchRepository.findOne({
      where: { matchId },
      relations: ['user1', 'user2'],
    });
  }

  async remove(id: string): Promise<void> {
    await this.matchRepository.delete(id);
  }
}

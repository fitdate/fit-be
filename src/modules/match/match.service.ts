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
      if (profile1.mbti.mbti === profile2.mbti.mbti) {
        similarity += 30;
      }
    }

    // 관심 카테고리 유사도
    if (profile1.interestCategory && profile2.interestCategory) {
      const categories1 = profile1.interestCategory.map(
        (cat) => cat.interestCategory.name,
      );
      const categories2 = profile2.interestCategory.map(
        (cat) => cat.interestCategory.name,
      );
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
      const feedback1 = profile1.userFeedbacks
        .map((fb) => (typeof fb.feedback === 'string' ? fb.feedback : ''))
        .join(' ');
      const feedback2 = profile2.userFeedbacks
        .map((fb) => (typeof fb.feedback === 'string' ? fb.feedback : ''))
        .join(' ');
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

    // 유사도 기반 가중치 적용하여 4명 선택
    const selectedProfiles: Profile[] = [];
    const totalSimilarity = profilesWithSimilarity.reduce(
      (sum, item) => sum + item.similarity,
      0,
    );

    while (selectedProfiles.length < 4 && profilesWithSimilarity.length > 0) {
      const random = Math.random() * totalSimilarity;
      let currentSum = 0;
      let selectedIndex = 0;

      for (let i = 0; i < profilesWithSimilarity.length; i++) {
        currentSum += profilesWithSimilarity[i].similarity;
        if (currentSum >= random) {
          selectedIndex = i;
          break;
        }
      }

      selectedProfiles.push(profilesWithSimilarity[selectedIndex].profile);
      profilesWithSimilarity.splice(selectedIndex, 1);
    }

    // 최적의 매칭 쌍 찾기
    const matches: { matchId: string; user1: Profile; user2: Profile }[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < selectedProfiles.length; i++) {
      if (usedIndices.has(i)) continue;

      let bestMatchIndex = -1;
      let bestMatchScore = -1;

      for (let j = i + 1; j < selectedProfiles.length; j++) {
        if (usedIndices.has(j)) continue;

        const matchScore = this.calculateSimilarity(
          selectedProfiles[i],
          selectedProfiles[j],
        );

        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestMatchIndex = j;
        }
      }

      if (bestMatchIndex !== -1) {
        const matchId = uuidv4();
        await this.create({
          matchId,
          user1Id: selectedProfiles[i].user.id,
          user2Id: selectedProfiles[bestMatchIndex].user.id,
        });
        matches.push({
          matchId,
          user1: selectedProfiles[i],
          user2: selectedProfiles[bestMatchIndex],
        });
        usedIndices.add(i);
        usedIndices.add(bestMatchIndex);
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

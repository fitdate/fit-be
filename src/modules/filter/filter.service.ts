import { Injectable, Logger } from '@nestjs/common';
import {
  UserIntroduction,
  UserFeedback,
  InterestCategory,
} from '../user-filter/interfaces/matching.interface';
import { User } from '../user/entities/user.entity';
import { MBTI_RECOMMEND_LIST } from '../profile/mbti/constants/mbti.constants';
import { MbtiType } from '../profile/mbti/constants/mbti.constants';
import { UserIntroduction as UserIntroEntity } from '../profile/introduction/entities/user-introduction.entity';
import { UserFeedback as UserFeedbackEntity } from '../profile/feedback/entities/user-feedback.entity';
import { UserInterestCategory } from '../profile/interest-category/entities/user-interest-category.entity';
import {
  IntroductionWithContent,
  FeedbackWithContent,
  InterestCategoryWithName,
} from './types/matching.types';
import { UserWithScore } from './types/user-with-score.type';

@Injectable()
export class FilterService {
  private readonly logger = new Logger(FilterService.name);

  constructor() {}

  private mapToUserIntroduction(intro: UserIntroEntity): UserIntroduction {
    this.logger.debug(`소개 매핑: ${JSON.stringify(intro)}`);
    const introWithContent = intro.introduction as IntroductionWithContent;
    return {
      id: intro.id, // UUID는 문자열로 유지
      introductionId: intro.introduction?.id || '', // UUID 문자열로 유지
      content: introWithContent?.content || '',
    };
  }

  private mapToUserFeedback(feedback: UserFeedbackEntity): UserFeedback {
    this.logger.debug(`피드백 매핑: ${JSON.stringify(feedback)}`);
    const feedbackWithContent = feedback.feedback as FeedbackWithContent;
    return {
      id: feedback.id, // UUID는 문자열로 유지
      feedbackId: feedback.feedback?.id || '', // UUID 문자열로 유지
      content: feedbackWithContent?.content || '',
    };
  }

  private mapToInterestCategory(
    interest: UserInterestCategory,
  ): InterestCategory {
    this.logger.debug(`관심사 매핑: ${JSON.stringify(interest)}`);
    const categoryWithName =
      interest.interestCategory as InterestCategoryWithName;
    return {
      id: interest.id, // UUID는 문자열로 유지
      interestCategoryId: interest.interestCategory?.id || '', // UUID 문자열로 유지
      name: categoryWithName?.name || '',
    };
  }

  calculateMbtiCompatibility(mbti1: string, mbti2: string): number {
    this.logger.debug(`MBTI 호환성 계산: ${mbti1} vs ${mbti2}`);
    const compatibilityMatrix = MBTI_RECOMMEND_LIST;
    const typedMbti1 = mbti1 as MbtiType;
    const typedMbti2 = mbti2 as MbtiType;

    if (typedMbti1 === typedMbti2) {
      this.logger.debug('동일한 MBTI: 70점');
      return 70;
    }
    if (compatibilityMatrix[typedMbti1]?.includes(typedMbti2)) {
      this.logger.debug('최적 궁합 MBTI: 100점');
      return 100;
    }
    this.logger.debug('기본 MBTI 궁합: 50점');
    return 50;
  }

  calculateIntroductionMatch(
    intro1: UserIntroduction[],
    intro2: UserIntroduction[],
  ): number {
    if (!intro1.length || !intro2.length) return 0;
    const matchCount = intro1.filter((i1) =>
      intro2.some((i2) => i1.introductionId === i2.introductionId),
    ).length;
    return (matchCount / Math.max(intro1.length, intro2.length)) * 100;
  }

  calculateFeedbackMatch(
    feedback1: UserFeedback[],
    feedback2: UserFeedback[],
  ): number {
    if (!feedback1.length || !feedback2.length) return 0;
    const matchCount = feedback1.filter((f1) =>
      feedback2.some((f2) => f1.feedbackId === f2.feedbackId),
    ).length;
    return (matchCount / Math.max(feedback1.length, feedback2.length)) * 100;
  }

  calculateInterestMatch(
    interests1: InterestCategory[],
    interests2: InterestCategory[],
  ): number {
    if (!interests1.length || !interests2.length) return 0;
    const matchCount = interests1.filter((i1) =>
      interests2.some((i2) => i1.interestCategoryId === i2.interestCategoryId),
    ).length;
    return (matchCount / Math.max(interests1.length, interests2.length)) * 100;
  }

  calculateRegionMatch(region1: string, region2: string): number {
    if (region1 === region2) return 100;
    const [r1] = region1.split(' ');
    const [r2] = region2.split(' ');
    return r1 === r2 ? 70 : 30;
  }

  addCompatibilityScores(users: User[], currentUser: User): UserWithScore[] {
    this.logger.debug(`호환성 점수 계산 시작 - 현재 사용자: ${currentUser.id}`);
    const scoredUsers = users.map((user) => {
      let score = 0;
      this.logger.debug(`사용자 ${user.id}의 호환성 계산 중`);

      if (user.profile?.mbti?.mbti && currentUser.profile?.mbti?.mbti) {
        const mbtiScore =
          this.calculateMbtiCompatibility(
            currentUser.profile.mbti.mbti,
            user.profile.mbti.mbti,
          ) * 0.2;
        this.logger.debug(`MBTI 점수: ${mbtiScore}`);
        score += mbtiScore;
      }

      if (
        user.profile?.userIntroductions &&
        currentUser.profile?.userIntroductions
      ) {
        const mappedIntro1 = currentUser.profile.userIntroductions.map(
          (intro) => this.mapToUserIntroduction(intro),
        );
        const mappedIntro2 = user.profile.userIntroductions.map((intro) =>
          this.mapToUserIntroduction(intro),
        );

        score +=
          this.calculateIntroductionMatch(mappedIntro1, mappedIntro2) * 0.2;
      }

      if (user.profile?.userFeedbacks && currentUser.profile?.userFeedbacks) {
        const mappedFeedback1 = currentUser.profile.userFeedbacks.map(
          (feedback) => this.mapToUserFeedback(feedback),
        );
        const mappedFeedback2 = user.profile.userFeedbacks.map((feedback) =>
          this.mapToUserFeedback(feedback),
        );

        score +=
          this.calculateFeedbackMatch(mappedFeedback1, mappedFeedback2) * 0.2;
      }

      if (
        user.profile?.interestCategory &&
        currentUser.profile?.interestCategory
      ) {
        const mappedInterests1 = currentUser.profile.interestCategory.map(
          (interest) => this.mapToInterestCategory(interest),
        );
        const mappedInterests2 = user.profile.interestCategory.map((interest) =>
          this.mapToInterestCategory(interest),
        );

        score +=
          this.calculateInterestMatch(mappedInterests1, mappedInterests2) * 0.2;
      }

      if (user.region && currentUser.region) {
        const regionScore =
          this.calculateRegionMatch(currentUser.region, user.region) * 0.2;
        this.logger.debug(`지역 점수: ${regionScore}`);
        score += regionScore;
      }

      this.logger.debug(`최종 호환성 점수: ${score}`);
      return {
        ...user,
        compatibilityScore: score,
      } as UserWithScore;
    });

    const sortedUsers = scoredUsers.sort(
      (a, b) => (b.compatibilityScore ?? 0) - (a.compatibilityScore ?? 0),
    );
    this.logger.debug(
      `호환성 점수 계산 완료 - 총 ${sortedUsers.length}명의 사용자`,
    );
    return sortedUsers;
  }
}

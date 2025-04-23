import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileService } from '../profile/profile.service';
import { Profile } from '../profile/entities/profile.entity';
import { Match } from './entities/match.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enum/notification.enum';
import { UserService } from '../user/user.service';

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    private readonly profileService: ProfileService,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  // 유사도 계산
  private calculateSimilarity(profile1: Profile, profile2: Profile): number {
    let similarity = 0;

    // MBTI 유사도
    if (profile1?.mbti?.mbti && profile2?.mbti?.mbti) {
      if (profile1.mbti.mbti === profile2.mbti.mbti) {
        similarity += 30;
      }
    }

    // 관심 카테고리 유사도
    if (profile1.interestCategory && profile2.interestCategory) {
      const categories1 = profile1.interestCategory
        .filter((cat) => cat.interestCategory && cat.interestCategory.name)
        .map((cat) => cat.interestCategory.name);
      const categories2 = profile2.interestCategory
        .filter((cat) => cat.interestCategory && cat.interestCategory.name)
        .map((cat) => cat.interestCategory.name);
      const commonCategories = categories1.filter((cat) =>
        categories2.includes(cat),
      );
      similarity +=
        (commonCategories.length /
          Math.max(categories1.length, categories2.length)) *
        30;
    }

    // 직업 유사도
    if (profile1?.user?.job && profile2?.user?.job) {
      if (profile1.user.job === profile2.user.job) {
        similarity += 20;
      }
    }

    // 피드백 유사도
    if (profile1?.userFeedbacks?.length && profile2?.userFeedbacks?.length) {
      const feedback1 = profile1.userFeedbacks
        .filter((fb) => fb?.feedback)
        .map((fb) => (typeof fb.feedback === 'string' ? fb.feedback : ''))
        .join(' ');
      const feedback2 = profile2.userFeedbacks
        .filter((fb) => fb?.feedback)
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

  // 성별 필터링
  private filterProfilesByGender(
    profiles: Profile[],
    gender: string,
  ): Profile[] {
    return profiles.filter(
      (profile) => profile.user && profile.user.gender === gender,
    );
  }

  // 랜덤 프로필 선택
  private selectRandomProfiles(profiles: Profile[], count: number): Profile[] {
    const selected: Profile[] = [];
    while (selected.length < count && profiles.length > 0) {
      const randomIndex = Math.floor(Math.random() * profiles.length);
      selected.push(profiles[randomIndex]);
      profiles.splice(randomIndex, 1);
    }
    return selected;
  }

  // 매칭 생성
  private async createMatch(
    profile1: Profile,
    profile2: Profile,
  ): Promise<{
    matchId: string;
    user1: Profile;
    user2: Profile;
  }> {
    if (!profile1?.id || !profile2?.id) {
      throw new Error('유효하지 않은 프로필입니다.');
    }

    const matchId = uuidv4();
    await this.create({
      matchId,
      user1Id: profile1.id,
      user2Id: profile2.id,
    });
    return {
      matchId,
      user1: profile1,
      user2: profile2,
    };
  }

  async findRandomMatches(userId: string): Promise<{
    matches: { matchId: string; user1: Profile; user2: Profile }[];
  }> {
    // 현재 사용자의 성별 가져오기
    const currentUser = await this.userService.findOne(userId);

    if (!currentUser || !currentUser.gender) {
      throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');
    }

    // 유사도 계산을 위해 현재 사용자의 프로필 정보 가져오기
    const currentProfile = await this.profileService.getProfileByUserId(userId);

    if (!currentProfile) {
      throw new NotFoundException('프로필을 찾을 수 없습니다.');
    }

    // 모든 프로필 가져오기 (현재 사용자 제외)
    const allProfiles = await this.profileService.findAll();
    const otherProfiles = allProfiles.filter(
      (profile) =>
        profile?.user?.id &&
        profile.user.id !== userId &&
        profile?.user?.gender &&
        profile.user.gender !== currentUser.gender, // 성별 다른 사람만 가져오기
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

    // 매칭 생성
    const matches: { matchId: string; user1: Profile; user2: Profile }[] = [];

    // 2명씩 매칭
    for (let i = 0; i < selectedProfiles.length; i += 2) {
      if (i + 1 < selectedProfiles.length) {
        const match = await this.createMatch(
          selectedProfiles[i],
          selectedProfiles[i + 1],
        );
        matches.push(match);
      }
    }

    return { matches };
  }

  async findRandomPublicMatches(): Promise<{
    matches: { matchId: string; user1: Profile; user2: Profile }[];
  }> {
    // 모든 프로필 가져오기
    const allProfiles = await this.profileService.findAll();

    // 성별별로 프로필 분리
    const maleProfiles = this.filterProfilesByGender(allProfiles, '남자');
    const femaleProfiles = this.filterProfilesByGender(allProfiles, '여자');

    // 각 성별에서 랜덤으로 2명씩 선택
    const selectedMaleProfiles = this.selectRandomProfiles(maleProfiles, 2);
    const selectedFemaleProfiles = this.selectRandomProfiles(femaleProfiles, 2);

    // 매칭 생성
    const matches: { matchId: string; user1: Profile; user2: Profile }[] = [];

    // 남자-남자 매칭
    if (selectedMaleProfiles.length === 2) {
      try {
        const match = await this.createMatch(
          selectedMaleProfiles[0],
          selectedMaleProfiles[1],
        );
        matches.push(match);
      } catch (error) {
        console.error('남자-남자 매칭 생성 실패:', error);
      }
    }

    // 여자-여자 매칭
    if (selectedFemaleProfiles.length === 2) {
      try {
        const match = await this.createMatch(
          selectedFemaleProfiles[0],
          selectedFemaleProfiles[1],
        );
        matches.push(match);
      } catch (error) {
        console.error('여자-여자 매칭 생성 실패:', error);
      }
    }

    return { matches };
  }

  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    const match = this.matchRepository.create({
      id: createMatchDto.matchId,
      user1: { id: createMatchDto.user1Id },
      user2: { id: createMatchDto.user2Id },
    });

    const savedMatch = await this.matchRepository.save(match);

    // 매칭 알림 생성
    await this.notificationService.create({
      title: '새로운 매칭이 생성되었습니다!',
      content: '새로운 매칭이 생성되었습니다. 매칭결과에서 확인해보세요!',
      type: NotificationType.MATCH,
      receiverId: Number(createMatchDto.user1Id),
    });

    await this.notificationService.create({
      title: '새로운 매칭이 생성되었습니다!',
      content: '새로운 매칭이 생성되었습니다. 매칭결과에서 확인해보세요!',
      type: NotificationType.MATCH,
      receiverId: Number(createMatchDto.user2Id),
    });

    return savedMatch;
  }

  async findAll(): Promise<Match[]> {
    return this.matchRepository.find({
      relations: ['user1', 'user2'],
    });
  }

  async findOne(id: string): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ['user1', 'user2'],
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  async findByMatchId(matchId: string): Promise<Match | null> {
    return this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['user1', 'user2'],
    });
  }

  async remove(id: string): Promise<void> {
    await this.matchRepository.delete(id);
  }

  /**
   * 월드컵 페이지에서 선택하기 버튼을 누를 때 알림을 보냅니다.
   * @param matchId 매칭 ID
   * @param selectedUserId 선택된 사용자 ID
   * @param currentUserId 현재 사용자 ID
   */
  async sendSelectionNotification(
    matchId: string,
    selectedUserId: string,
    currentUserId: string,
  ): Promise<void> {
    const match = await this.findOne(matchId);
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // 선택된 사용자에게 알림 전송
    await this.notificationService.create({
      type: NotificationType.MATCH,
      receiverId: Number(selectedUserId),
      data: {
        matchId,
        senderId: currentUserId,
      },
    });
  }

  /**
   * 월드컵 페이지에서 모두 선택하기 버튼을 누를 때 두 명의 사용자에게 알림을 보냅니다.
   * @param matchId 매칭 ID
   * @param currentUserId 현재 사용자 ID
   */
  async sendAllSelectionNotification(
    matchId: string,
    currentUserId: string,
  ): Promise<void> {
    const match = await this.findOne(matchId);
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // 두 명의 사용자에게 알림 전송
    await this.notificationService.create({
      type: NotificationType.MATCH,
      receiverId: Number(match.user1.id),
      data: {
        matchId,
        senderId: currentUserId,
      },
    });

    await this.notificationService.create({
      type: NotificationType.MATCH,
      receiverId: Number(match.user2.id),
      data: {
        matchId,
        senderId: currentUserId,
      },
    });
  }

  /**
   * 매칭 결과 페이지에서 대화하러 가기 버튼을 누를 때 상대방에게 채팅방 입장 알림을 보냅니다.
   * @param matchId 매칭 ID
   * @param currentUserId 현재 사용자 ID
   */
  async sendChatRoomEntryNotification(
    matchId: string,
    currentUserId: string,
  ): Promise<void> {
    const match = await this.findOne(matchId);
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // 상대방 ID 찾기
    const opponentId =
      match.user1.id === currentUserId ? match.user2.id : match.user1.id;

    // 상대방에게 채팅방 입장 알림 전송
    await this.notificationService.create({
      title: '채팅방 입장 알림',
      content: '상대방이 채팅방에 입장했습니다. 대화를 시작해보세요!',
      type: NotificationType.COFFEE_CHAT,
      receiverId: Number(opponentId),
      data: {
        matchId,
        senderId: currentUserId,
      },
    });
  }
}

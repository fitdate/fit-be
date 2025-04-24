import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enum/notification.enum';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  // 유사도 계산
  private calculateSimilarity(user1: User, user2: User): number {
    let similarity = 0;

    // MBTI 유사도
    if (user1?.profile?.mbti?.mbti && user2?.profile?.mbti?.mbti) {
      if (user1.profile.mbti.mbti === user2.profile.mbti.mbti) {
        similarity += 50;
      }
    }

    // 관심 카테고리 유사도
    if (
      user1?.profile?.interestCategory?.length &&
      user2?.profile?.interestCategory?.length
    ) {
      const categories1 = new Set(
        user1.profile.interestCategory
          .filter((cat) => cat.interestCategory && cat.interestCategory.name)
          .map((cat) => cat.interestCategory.name),
      );
      const categories2 = new Set(
        user2.profile.interestCategory
          .filter((cat) => cat.interestCategory && cat.interestCategory.name)
          .map((cat) => cat.interestCategory.name),
      );

      const commonCategories = new Set(
        [...categories1].filter((cat) => categories2.has(cat)),
      );

      similarity +=
        (commonCategories.size / Math.max(categories1.size, categories2.size)) *
        50;
    }

    return similarity;
  }

  // 성별 필터링
  private filterUsersByGender(
    users: User[],
    gender: string,
    currentUserId: string,
  ): User[] {
    return users.filter(
      (user) => user.gender !== gender && user.id !== currentUserId,
    );
  }

  // 랜덤 사용자 선택
  private selectRandomUsers(users: User[], count: number): User[] {
    const selected: User[] = [];
    while (selected.length < count && users.length > 0) {
      const randomIndex = Math.floor(Math.random() * users.length);
      selected.push(users[randomIndex]);
      users.splice(randomIndex, 1);
    }
    return selected;
  }

  // 매칭 생성
  private async createMatch(
    user1: User,
    user2: User,
  ): Promise<{
    matchId: string;
    user1: User;
    user2: User;
  }> {
    if (!user1?.id || !user2?.id) {
      throw new Error('유효하지 않은 사용자입니다.');
    }

    const matchId = uuidv4();
    await this.create({
      matchId,
      user1Id: user1.id,
      user2Id: user2.id,
    });
    return {
      matchId,
      user1,
      user2,
    };
  }

  // 랜덤 매칭 생성 (로그인)
  async findRandomMatches(userId: string): Promise<{
    matches: { matchId: string; user1: User; user2: User }[];
  }> {
    const currentUser = await this.userService.findOne(userId);
    if (!currentUser) {
      throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');
    }

    if (!currentUser.gender) {
      throw new NotFoundException('사용자의 성별 정보가 필요합니다.');
    }

    const allUsers = await this.userService.getAllUserInfo();

    // 현재 사용자 제외하고 성별이 다른 사용자만 필터링
    const oppositeGenderUsers = this.filterUsersByGender(
      allUsers,
      currentUser.gender === '남자' ? '여자' : '남자',
      userId,
    );

    // 유사도 계산 및 정렬
    const usersWithSimilarity = oppositeGenderUsers
      .map((user) => ({
        user,
        similarity: this.calculateSimilarity(currentUser, user),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    // 유사도 기반 가중치 적용하여 4명 선택
    const selectedUsers: User[] = [];
    const totalSimilarity = usersWithSimilarity.reduce(
      (sum, item) => sum + item.similarity,
      0,
    );

    while (selectedUsers.length < 4 && usersWithSimilarity.length > 0) {
      const random = Math.random() * totalSimilarity;
      let currentSum = 0;
      let selectedIndex = 0;

      for (let i = 0; i < usersWithSimilarity.length; i++) {
        currentSum += usersWithSimilarity[i].similarity;
        if (currentSum >= random) {
          selectedIndex = i;
          break;
        }
      }

      selectedUsers.push(usersWithSimilarity[selectedIndex].user);
      usersWithSimilarity.splice(selectedIndex, 1);
    }

    // 매칭 생성
    const matches: { matchId: string; user1: User; user2: User }[] = [];

    // 2명씩 매칭
    for (let i = 0; i < selectedUsers.length; i += 2) {
      if (i + 1 < selectedUsers.length) {
        const match = await this.createMatch(
          selectedUsers[i],
          selectedUsers[i + 1],
        );
        matches.push(match);
      }
    }

    return { matches };
  }

  // 공개 매칭 생성 (비로그인)
  async findRandomPublicMatches(): Promise<{
    matches: { matchId: string; user1: User; user2: User }[];
  }> {
    try {
      // 페이징 처리로 사용자 정보 가져오기 (10명씩)
      const allUsers = await this.userService.getAllUserInfo();

      // 성별별로 사용자 분리
      const maleUsers = this.filterUsersByGender(allUsers, '남자', '');
      const femaleUsers = this.filterUsersByGender(allUsers, '여자', '');

      // 각 성별에서 랜덤으로 2명씩 선택
      const selectedMaleUsers = this.selectRandomUsers(maleUsers, 2);
      const selectedFemaleUsers = this.selectRandomUsers(femaleUsers, 2);

      // 매칭 생성
      const matches: { matchId: string; user1: User; user2: User }[] = [];

      // 남자-남자 매칭
      if (selectedMaleUsers.length === 2) {
        try {
          const match = await this.createMatch(
            selectedMaleUsers[0],
            selectedMaleUsers[1],
          );
          matches.push(match);
        } catch (error) {
          throw new InternalServerErrorException(
            '남자-남자 매칭 생성 실패: ' + (error as Error).message,
          );
        }
      }

      // 여자-여자 매칭
      if (selectedFemaleUsers.length === 2) {
        try {
          const match = await this.createMatch(
            selectedFemaleUsers[0],
            selectedFemaleUsers[1],
          );
          matches.push(match);
        } catch (error) {
          throw new InternalServerErrorException(
            '여자-여자 매칭 생성 실패: ' + (error as Error).message,
          );
        }
      }

      return { matches };
    } catch (error) {
      throw new InternalServerErrorException(
        '매칭 생성 중 오류가 발생했습니다: ' + (error as Error).message,
      );
    }
  }

  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    const match = this.matchRepository.create({
      id: createMatchDto.matchId,
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

  async findOne(id: string): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ['user1', 'user2'],
    });
    if (!match) {
      throw new NotFoundException('매치를 찾을 수 없습니다.');
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
    try {
      const match = await this.findByMatchId(matchId);
      if (!match) {
        throw new NotFoundException('매치를 찾을 수 없습니다.');
      }

      const currentUser = await this.userService.findOne(currentUserId);
      if (!currentUser) {
        throw new NotFoundException('현재 사용자를 찾을 수 없습니다.');
      }

      await this.notificationService.create({
        receiverId: selectedUserId,
        type: NotificationType.MATCH,
        title: '새로운 매칭 알림',
        content: `${currentUser.nickname}님이 당신을 선택했습니다!`,
        data: { matchId },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        '알림 전송 중 오류가 발생했습니다: ' + (error as Error).message,
      );
    }
  }

  /**
   * 월드컵 페이지에서 모두 선택하기 버튼을 누를 때 두 명의 사용자에게 알림을 보냅니다.
   * @param matchId 매칭 ID
   * @param currentUserId 현재 사용자 ID
   */
  async sendAllSelectionNotification(
    matchId: string,
    currentUserId: string,
    firstSelectedUserId: string,
    secondSelectedUserId: string,
  ): Promise<void> {
    try {
      const match = await this.findByMatchId(matchId);
      if (!match) {
        throw new NotFoundException('매치를 찾을 수 없습니다.');
      }

      const currentUser = await this.userService.findOne(currentUserId);
      if (!currentUser) {
        throw new NotFoundException('현재 사용자를 찾을 수 없습니다.');
      }

      // 두 사용자에게 모두 알림 전송
      await Promise.all([
        this.notificationService.create({
          receiverId: firstSelectedUserId,
          type: NotificationType.MATCH,
          title: '새로운 매칭 알림',
          content: `${currentUser.nickname}님이 당신을 선택했습니다!`,
          data: { matchId },
        }),
        this.notificationService.create({
          receiverId: secondSelectedUserId,
          type: NotificationType.MATCH,
          title: '새로운 매칭 알림',
          content: `${currentUser.nickname}님이 당신을 선택했습니다!`,
          data: { matchId },
        }),
      ]);
    } catch (error) {
      throw new InternalServerErrorException(
        '알림 전송 중 오류가 발생했습니다: ' + (error as Error).message,
      );
    }
  }

  /**
   * 채팅방 입장 알림을 전송합니다.
   * @param matchId 매칭 ID
   * @param currentUserId 현재 사용자 ID
   */
  async sendChatRoomEntryNotification(
    matchId: string,
    currentUserId: string,
  ): Promise<void> {
    try {
      const match = await this.findByMatchId(matchId);
      if (!match) {
        throw new NotFoundException('매칭을 찾을 수 없습니다.');
      }

      const currentUser = await this.userService.findOne(currentUserId);
      if (!currentUser) {
        throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');
      }

      // 상대방에게 알림 전송
      const receiverId =
        match.user1.id === currentUserId ? match.user2.id : match.user1.id;
      await this.notificationService.create({
        type: NotificationType.COFFEE_CHAT,
        receiverId,
        title: '새로운 채팅 알림',
        content: `${currentUser.nickname}님이 채팅방에 입장했습니다!`,
        data: { matchId },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        '채팅방 입장 알림 전송 중 오류가 발생했습니다: ' +
          (error as Error).message,
      );
    }
  }

  async getUserMatchList(userId: string) {
    const matchList = await this.matchRepository.find({
      where: [{ user1: { id: userId } }, { user2: { id: userId } }],
      relations: {
        user1: {
          profile: {
            profileImage: true,
          },
        },
        user2: {
          profile: {
            profileImage: true,
          },
        },
      },
    });
    return matchList;
  }
}

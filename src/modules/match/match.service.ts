import { Injectable, NotFoundException } from '@nestjs/common';
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
        similarity += 30;
      }
    }

    // 관심 카테고리 유사도
    if (
      user1?.profile?.interestCategory?.length &&
      user2?.profile?.interestCategory?.length
    ) {
      const categories1 = user1.profile.interestCategory
        .filter((cat) => cat.interestCategory && cat.interestCategory.name)
        .map((cat) => cat.interestCategory.name);
      const categories2 = user2.profile.interestCategory
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
    if (user1?.job && user2?.job) {
      if (user1.job === user2.job) {
        similarity += 20;
      }
    }

    // 피드백 유사도
    if (
      user1?.profile?.userFeedbacks?.length &&
      user2?.profile?.userFeedbacks?.length
    ) {
      const feedback1 = user1.profile.userFeedbacks
        .filter((fb) => fb?.feedback)
        .map((fb) => (typeof fb.feedback === 'string' ? fb.feedback : ''))
        .join(' ');
      const feedback2 = user2.profile.userFeedbacks
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
  private filterUsersByGender(users: User[], gender: string): User[] {
    return users.filter((user) => user.gender !== gender);
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

  async findRandomMatches(userId: string): Promise<{
    matches: { matchId: string; user1: User; user2: User }[];
  }> {
    console.log('=== 매칭 시작 ===');
    console.log('현재 사용자 ID:', userId);

    // 현재 사용자와 다른 성별의 사용자들을 한 번의 쿼리로 가져옴
    const currentUser = await this.userService.findOne(userId);
    if (!currentUser || !currentUser.gender) {
      throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');
    }

    console.log('현재 사용자 정보:', {
      id: currentUser.id,
      gender: currentUser.gender,
      nickname: currentUser.nickname,
    });

    const oppositeGender = currentUser.gender === '남자' ? '여자' : '남자';
    const allUsers = await this.userService.getAllUserInfo();

    // 현재 사용자 제외하고 성별이 다른 사용자만 필터링
    const oppositeGenderUsers = allUsers.filter(
      (user) => user && user.id && user.gender === oppositeGender,
    );

    console.log('반대 성별 사용자 수:', oppositeGenderUsers.length);
    console.log(
      '반대 성별 사용자 목록:',
      oppositeGenderUsers.map((u) => ({
        id: u.id,
        gender: u.gender,
        nickname: u.nickname,
      })),
    );

    if (oppositeGenderUsers.length < 2) {
      throw new NotFoundException('매칭 가능한 사용자가 충분하지 않습니다.');
    }

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

      const selectedUser = usersWithSimilarity[selectedIndex].user;
      if (selectedUser && selectedUser.id) {
        selectedUsers.push(selectedUser);
      }
      usersWithSimilarity.splice(selectedIndex, 1);
    }

    console.log('선택된 사용자 수:', selectedUsers.length);
    console.log(
      '선택된 사용자 목록:',
      selectedUsers.map((u) => ({
        id: u.id,
        gender: u.gender,
        nickname: u.nickname,
      })),
    );

    if (selectedUsers.length < 2) {
      throw new NotFoundException('매칭 가능한 사용자가 충분하지 않습니다.');
    }

    // 매칭 생성
    const matches: { matchId: string; user1: User; user2: User }[] = [];

    // 2명씩 매칭
    for (let i = 0; i < selectedUsers.length; i += 2) {
      if (i + 1 < selectedUsers.length) {
        const user1 = selectedUsers[i];
        const user2 = selectedUsers[i + 1];

        if (!user1?.id || !user2?.id) {
          console.log('유효하지 않은 사용자 ID 발견:', {
            user1: user1?.id,
            user2: user2?.id,
          });
          continue;
        }

        const matchId = uuidv4();
        console.log('매칭 생성:', {
          matchId,
          user1: {
            id: user1.id,
            gender: user1.gender,
            nickname: user1.nickname,
          },
          user2: {
            id: user2.id,
            gender: user2.gender,
            nickname: user2.nickname,
          },
        });

        await this.create({
          matchId,
          user1Id: user1.id,
          user2Id: user2.id,
        });

        // 알림 전송
        await this.notificationService.create({
          title: '새로운 매칭이 생성되었습니다!',
          content: '새로운 매칭이 생성되었습니다. 매칭결과에서 확인해보세요!',
          type: NotificationType.MATCH,
          receiverId: user1.id,
        });

        await this.notificationService.create({
          title: '새로운 매칭이 생성되었습니다!',
          content: '새로운 매칭이 생성되었습니다. 매칭결과에서 확인해보세요!',
          type: NotificationType.MATCH,
          receiverId: user2.id,
        });

        matches.push({
          matchId,
          user1,
          user2,
        });
      }
    }

    console.log('=== 매칭 결과 ===');
    console.log('생성된 매칭 수:', matches.length);
    console.log(
      '매칭 목록:',
      matches.map((m) => ({
        matchId: m.matchId,
        user1: {
          id: m.user1.id,
          gender: m.user1.gender,
          nickname: m.user1.nickname,
        },
        user2: {
          id: m.user2.id,
          gender: m.user2.gender,
          nickname: m.user2.nickname,
        },
      })),
    );

    if (matches.length === 0) {
      throw new NotFoundException('매칭을 생성할 수 없습니다.');
    }

    return { matches };
  }

  async findRandomPublicMatches(): Promise<{
    matches: { matchId: string; user1: User; user2: User }[];
  }> {
    // 모든 사용자 정보 가져오기
    const allUsers = await this.userService.getAllUserInfo();

    // 성별별로 사용자 분리
    const maleUsers = this.filterUsersByGender(allUsers, '남자');
    const femaleUsers = this.filterUsersByGender(allUsers, '여자');

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
        console.error('남자-남자 매칭 생성 실패:', error);
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
        console.error('여자-여자 매칭 생성 실패:', error);
      }
    }

    return { matches };
  }

  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    // 사용자 존재 여부 확인
    const user1 = await this.userService.findOne(createMatchDto.user1Id);
    const user2 = await this.userService.findOne(createMatchDto.user2Id);

    if (!user1 || !user2) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 트랜잭션 시작
    const queryRunner =
      this.matchRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 사용자 ID로 매칭 생성
      const match = this.matchRepository.create({
        id: createMatchDto.matchId,
        user1: { id: user1.id },
        user2: { id: user2.id },
      });

      const savedMatch = await queryRunner.manager.save(match);

      // 알림 전송
      if (user1) {
        await this.notificationService.create({
          title: '새로운 매칭이 생성되었습니다!',
          content: '새로운 매칭이 생성되었습니다. 매칭결과에서 확인해보세요!',
          type: NotificationType.MATCH,
          receiverId: createMatchDto.user1Id,
        });
      }

      if (user2) {
        await this.notificationService.create({
          title: '새로운 매칭이 생성되었습니다!',
          content: '새로운 매칭이 생성되었습니다. 매칭결과에서 확인해보세요!',
          type: NotificationType.MATCH,
          receiverId: createMatchDto.user2Id,
        });
      }

      await queryRunner.commitTransaction();
      return savedMatch;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
      receiverId: selectedUserId,
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
      receiverId: match.user1.id,
      data: {
        matchId,
        senderId: currentUserId,
      },
    });

    await this.notificationService.create({
      type: NotificationType.MATCH,
      receiverId: match.user2.id,
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
      receiverId: opponentId,
      data: {
        matchId,
        senderId: currentUserId,
      },
    });
  }
}

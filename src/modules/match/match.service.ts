import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { MatchSelection } from './entities/match-selection.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enum/notification.enum';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { PassService } from '../pass/pass.service';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchSelection)
    private readonly matchSelectionRepository: Repository<MatchSelection>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
    private readonly passService: PassService,
  ) {}

  // 성별에 따른 사용자 필터링
  private filterUsersByGender(
    users: User[],
    gender: string,
    currentUserId: string,
  ): User[] {
    const oppositeGender = gender === '남자' ? '여자' : '남자';
    return users.filter(
      (user) => user.gender !== oppositeGender && user.id !== currentUserId,
    );
  }

  // 랜덤으로 사용자 선택
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

  // 로그인 사용자를 위한 랜덤 매칭 생성
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
    const oppositeGenderUsers = this.filterUsersByGender(
      allUsers,
      currentUser.gender === '남자' ? '여자' : '남자',
      userId,
    );

    const selectorsList = await this.getSelectorsList(userId);
    const matchedUserIds = new Set<string>();
    matchedUserIds.add(userId);

    selectorsList.forEach((selection) => {
      if (selection.selector?.id) matchedUserIds.add(selection.selector.id);
      if (selection.selected?.id) matchedUserIds.add(selection.selected.id);
    });

    const passedUserIds = await this.passService.getPassedUserIds(userId);
    passedUserIds.forEach((id) => matchedUserIds.add(id));

    const availableUsers = oppositeGenderUsers.filter(
      (user) => !matchedUserIds.has(user.id),
    );

    const selectedUsers = this.selectRandomUsers(availableUsers, 4);
    const matches: { matchId: string; user1: User; user2: User }[] = [];

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

  // 비로그인 사용자를 위한 공개 매칭 생성
  async findRandomPublicMatches(): Promise<{
    matches: { matchId: string; user1: User; user2: User }[];
  }> {
    try {
      const allUsers = await this.userService.getAllUserInfo();
      const maleUsers = this.filterUsersByGender(allUsers, '남자', '');
      const femaleUsers = this.filterUsersByGender(allUsers, '여자', '');

      const selectedMaleUsers = this.selectRandomUsers(maleUsers, 2);
      const selectedFemaleUsers = this.selectRandomUsers(femaleUsers, 2);
      const matches: { matchId: string; user1: User; user2: User }[] = [];

      if (selectedMaleUsers.length === 2) {
        const match = await this.createMatch(
          selectedMaleUsers[0],
          selectedMaleUsers[1],
        );
        matches.push(match);
      }

      if (selectedFemaleUsers.length === 2) {
        const match = await this.createMatch(
          selectedFemaleUsers[0],
          selectedFemaleUsers[1],
        );
        matches.push(match);
      }

      return { matches };
    } catch (error) {
      throw new InternalServerErrorException(
        '매칭 생성 중 오류가 발생했습니다: ' + (error as Error).message,
      );
    }
  }

  // 매칭 생성
  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    const match = this.matchRepository.create({
      id: createMatchDto.matchId,
      user1: { id: createMatchDto.user1Id },
      user2: { id: createMatchDto.user2Id },
    });

    return this.matchRepository.save(match);
  }

  // 모든 매칭 조회
  async findAll(): Promise<Match[]> {
    return this.matchRepository.find({
      relations: ['user1', 'user2'],
    });
  }

  // 특정 매칭 조회
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

  // 매칭 ID로 조회
  async findByMatchId(matchId: string): Promise<Match | null> {
    return this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['user1', 'user2'],
    });
  }

  // 매칭 삭제
  async remove(id: string): Promise<void> {
    await this.matchRepository.delete(id);
  }

  // 선택 알림 전송
  async sendSelectionNotification(
    matchId: string,
    selectedUserId: string,
    currentUserId: string,
  ): Promise<void> {
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
      type: NotificationType.MATCH_REQUEST,
      title: '매칭 성공',
      content: `${currentUser.nickname}님이 매칭을 선택했습니다.`,
      data: {
        matchId,
        selectedUserId,
        currentUserId,
        currentUserNickname: currentUser.nickname,
      },
    });
  }

  // 전체 선택 알림 전송
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

      // match_selection 테이블에 두 사용자 모두에 대한 데이터 생성
      await Promise.all([
        this.matchSelectionRepository.save(
          this.matchSelectionRepository.create({
            selector: { id: currentUserId },
            selected: { id: firstSelectedUserId },
          }),
        ),
        this.matchSelectionRepository.save(
          this.matchSelectionRepository.create({
            selector: { id: currentUserId },
            selected: { id: secondSelectedUserId },
          }),
        ),
      ]);

      // 두 사용자에게 모두 알림 전송
      await Promise.all([
        this.notificationService.create({
          receiverId: firstSelectedUserId,
          type: NotificationType.MATCH_REQUEST,
          title: '매칭 성공',
          content: `${currentUser.nickname}님이 매칭을 선택했습니다.`,
          data: {
            matchId,
            selectedUserId: firstSelectedUserId,
            currentUserId,
          },
        }),
        this.notificationService.create({
          receiverId: secondSelectedUserId,
          type: NotificationType.MATCH_REQUEST,
          title: '매칭 성공',
          content: `${currentUser.nickname}님이 매칭을 선택했습니다.`,
          data: {
            matchId,
            selectedUserId: secondSelectedUserId,
            currentUserId,
          },
        }),
      ]);
    } catch (error) {
      throw new InternalServerErrorException(
        '매칭 선택 처리 중 오류가 발생했습니다: ' + (error as Error).message,
      );
    }
  }

  // 채팅방 입장 알림 전송
  async sendChatRoomEntryNotification(
    matchId: string,
    currentUserId: string,
  ): Promise<void> {
    const match = await this.findByMatchId(matchId);
    if (!match) {
      throw new NotFoundException('매치를 찾을 수 없습니다.');
    }

    const currentUser = await this.userService.findOne(currentUserId);
    if (!currentUser) {
      throw new NotFoundException('현재 사용자를 찾을 수 없습니다.');
    }

    const otherUserId =
      match.user1.id === currentUserId ? match.user2.id : match.user1.id;
    await this.notificationService.create({
      receiverId: otherUserId,
      type: NotificationType.CHAT,
      title: '채팅방 입장',
      content: `${currentUser.nickname}님이 채팅방에 입장했습니다.`,
      data: {
        matchId,
        currentUserId,
      },
    });
  }

  // 선택자 목록 조회
  async getSelectorsList(selectedUserId: string) {
    const selectorsList = await this.matchSelectionRepository
      .createQueryBuilder('matchSelection')
      .leftJoinAndSelect('matchSelection.selector', 'selector')
      .leftJoinAndSelect('selector.profile', 'selectorProfile')
      .leftJoinAndSelect('selectorProfile.profileImage', 'selectorProfileImage')
      .leftJoinAndSelect('matchSelection.selected', 'selected')
      .leftJoinAndSelect('selected.profile', 'selectedProfile')
      .leftJoinAndSelect('selectedProfile.profileImage', 'selectedProfileImage')
      .where('selected.id = :selectedUserId', { selectedUserId })
      .orWhere('selector.id = :selectedUserId', { selectedUserId })
      .getMany();

    return selectorsList;
  }
}

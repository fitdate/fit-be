import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enum/notification.enum';
import { IsNull } from 'typeorm';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 매칭 결과 페이지에서 매칭 성공 시 새로운 채팅방을 생성하고 참여자를 추가합니다.
   * @param userId 현재 로그인한 사용자 ID
   * @param partnerId 매칭된 상대방 ID
   * @returns 생성된 채팅방 정보
   */
  async createMatchingRoom(userId: string, partnerId: string) {
    this.logger.log(
      `채팅방 생성 시작 - 사용자 ID: ${userId}, 상대방 ID: ${partnerId}`,
    );

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const partner = await this.userRepository.findOne({
      where: { id: partnerId },
    });

    if (!user || !partner) {
      this.logger.error(
        `사용자를 찾을 수 없습니다. - 사용자: ${userId}, 상대방: ${partnerId}`,
      );
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    this.logger.log(
      `사용자 정보 조회 성공 - 사용자: ${user.nickname}, 상대방: ${partner.nickname}`,
    );

    // 기존 채팅방 확인
    const existingRoom = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoin('chatRoom.users', 'user1', 'user1.id = :userId', { userId })
      .innerJoin('chatRoom.users', 'user2', 'user2.id = :partnerId', {
        partnerId,
      })
      .getOne();

    if (existingRoom) {
      this.logger.log(`기존 채팅방이 존재합니다: ${existingRoom.id}`);
      return existingRoom;
    }

    this.logger.log('새로운 채팅방 생성 시작');
    const chatRoom = this.chatRoomRepository.create({
      name: `${user.nickname}님과 ${partner.nickname}님의 채팅방`,
      users: [user, partner],
    });

    this.logger.log(`채팅방 생성 전 사용자 수: ${chatRoom.users.length}`);
    this.logger.log(
      `사용자 목록: ${chatRoom.users.map((u) => u.nickname).join(', ')}`,
    );

    const savedRoom = await this.chatRoomRepository.save(chatRoom);
    this.logger.log(`채팅방 생성 완료 - ID: ${savedRoom.id}`);

    // 저장된 채팅방의 사용자 정보 확인
    const savedRoomWithUsers = await this.chatRoomRepository.findOne({
      where: { id: savedRoom.id },
      relations: ['users'],
    });
    this.logger.log(
      `저장된 채팅방의 사용자 수: ${savedRoomWithUsers?.users.length}`,
    );
    this.logger.log(
      `저장된 사용자 목록: ${savedRoomWithUsers?.users.map((u) => u.nickname).join(', ')}`,
    );

    // 채팅방 생성 시 양방향 알림 전송
    await this.sendChatRoomEntryNotification(savedRoom.id, userId, partnerId);
    await this.sendChatRoomEntryNotification(savedRoom.id, partnerId, userId);

    return savedRoom;
  }

  /**
   * 두 사용자 간의 채팅방을 찾거나 생성합니다.
   * @param userId 현재 로그인한 사용자 ID
   * @param partnerId 상대방 ID
   * @returns 채팅방 정보
   */
  private async getOrCreateRoom(userId: string, partnerId: string) {
    // 두 사용자 간의 기존 채팅방 찾기
    const existingRoom = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoin('chatRoom.users', 'user1', 'user1.id = :userId', { userId })
      .innerJoin('chatRoom.users', 'user2', 'user2.id = :partnerId', {
        partnerId,
      })
      .getOne();

    if (existingRoom) {
      // 기존 채팅방이 있을 때도 입장 알림 전송
      // userId(현재 로그인한 사용자)가 입장했을 때 partnerId(상대방)에게 알림
      await this.sendChatRoomEntryNotification(
        existingRoom.id,
        userId, // 현재 로그인한 사용자
        partnerId, // 상대방
      );
      return existingRoom;
    }

    // 채팅방이 없으면 새로 생성
    return this.createMatchingRoom(userId, partnerId);
  }

  /**
   * 채팅 페이지에서 대화방 버튼 클릭 시 두 사용자 간의 채팅방을 찾거나 생성합니다.
   * @param userId 현재 로그인한 사용자 ID
   * @param partnerId 상대방 ID
   * @returns 채팅방 정보
   */
  async findOrCreateChatRoom(userId: string, partnerId: string) {
    const chatRoom = await this.getOrCreateRoom(userId, partnerId);

    // 채팅방 입장 알림 전송 - 현재 사용자(userId)가 입장했을 때 상대방(partnerId)에게 알림
    await this.sendChatRoomEntryNotification(chatRoom.id, userId, partnerId);

    return chatRoom;
  }

  /**
   * 커피챗 수락 시 채팅방을 생성하고 알림을 전송합니다.
   * @param userId 현재 로그인한 사용자 ID
   * @param partnerId 매칭된 상대방 ID
   * @returns 생성된 채팅방 정보
   */
  async acceptCoffeeChat(userId: string, partnerId: string) {
    this.logger.log(
      `커피챗 수락 처리 시작 - 사용자 ID: ${userId}, 상대방 ID: ${partnerId}`,
    );

    // 채팅방 생성
    const chatRoom = await this.createMatchingRoom(userId, partnerId);

    // 커피챗 수락 알림 전송
    const notification = {
      type: NotificationType.COFFEE_CHAT,
      receiverId: partnerId,
      title: '커피챗 수락',
      content:
        '상대방이 커피챗을 수락했습니다. 채팅방에서 대화를 시작해보세요!',
      data: {
        chatRoomId: chatRoom.id,
        senderId: userId,
      },
    };

    await this.notificationService.create(notification);

    this.logger.log(`커피챗 수락 처리 완료 - 채팅방 ID: ${chatRoom.id}`);

    return chatRoom;
  }

  /**
   * 사용자의 채팅방 목록을 조회합니다.
   * @param userId 조회할 사용자 ID
   * @returns 채팅방 목록 (참여자 정보 포함)
   */
  async getRooms(userId: string) {
    this.logger.log(`채팅방 목록 조회 시작 - 사용자 ID: ${userId}`);

    const rooms = await this.chatRoomRepository.find({
      relations: ['users'],
      where: {
        users: { id: userId },
        deletedAt: IsNull(),
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    this.logger.log(`조회된 채팅방 수: ${rooms.length}`);
    rooms.forEach((room, index) => {
      this.logger.log(`채팅방 ${index + 1}:`);
      this.logger.log(`- ID: ${room.id}`);
      this.logger.log(`- 이름: ${room.name}`);
      this.logger.log(`- 참여자 수: ${room.users.length}`);
      room.users.forEach((user, userIndex) => {
        this.logger.log(`  - 사용자 ${userIndex + 1}:`);
        this.logger.log(`    - ID: ${user.id}`);
        this.logger.log(`    - 이름: ${user.name}`);
        this.logger.log(`    - 생년월일: ${user.birthday}`);
        this.logger.log(`    - 키: ${user.height}`);
      });
    });

    return rooms
      .map((room) => {
        const partner = room.users.find((user) => user.id !== userId);
        if (!partner) {
          this.logger.warn(`채팅방 ${room.id}에서 상대방을 찾을 수 없습니다.`);
          return null;
        }
        return {
          id: room.id,
          name: room.name,
          userId: userId,
          partner: {
            id: partner.id,
            name: partner.name,
            age: partner.birthday ? this.calculateAge(partner.birthday) : null,
            height: partner.height || null,
          },
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        };
      })
      .filter(Boolean);
  }

  /**
   * 생년월일로 나이를 계산합니다.
   * @param birthday 생년월일 (YYYY-MM-DD)
   * @returns 나이
   */
  private calculateAge(birthday: string): number {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  /**
   * 날짜를 "오전/오후 HH:mm" 형식으로 변환합니다.
   * @param date 변환할 날짜
   * @returns 변환된 시간 문자열
   */
  private formatTime(date: Date | undefined): string {
    if (!date) return '';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours < 12 ? '오전' : '오후';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${ampm} ${formattedHours}:${formattedMinutes}`;
  }

  /**
   * 채팅 메시지를 조회합니다.
   * @param chatRoomId 특정 채팅방의 메시지만 조회할 경우 채팅방 ID
   * @returns 채팅 메시지 목록
   */
  async getMessages(chatRoomId: string) {
    const limit = 50;
    const query = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.user', 'user')
      .leftJoinAndSelect('message.chatRoom', 'chatRoom')
      .orderBy('message.createdAt', 'DESC')
      .take(limit);

    if (chatRoomId) {
      query.where('message.chatRoomId = :chatRoomId', { chatRoomId });
    }

    const [messages, total] = await query.getManyAndCount();

    return {
      messages: messages.map((message) => ({
        id: message.id,
        content: message.content,
        isSystem: message.isSystem,
        createdAt: this.formatTime(message.createdAt),
        user: message.user
          ? {
              id: message.user.id,
              nickname: message.user.nickname,
            }
          : null,
        chatRoom: message.chatRoom
          ? {
              id: message.chatRoom.id,
              name: message.chatRoom.name,
            }
          : null,
      })),
      total,
      hasMore: total > limit,
    };
  }

  /**
   * 사용자가 채팅방에서 나갑니다.
   * @param chatRoomId 나갈 채팅방 ID
   * @param userId 나가는 사용자 ID
   * @returns 성공 여부
   */
  async exitRoom(chatRoomId: string, userId: string) {
    // 사용자 존재 여부 확인
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 채팅방 존재 여부 및 참여자 정보 확인
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['users'],
    });

    if (!chatRoom) {
      throw new Error('채팅방을 찾을 수 없습니다.');
    }

    // 사용자가 채팅방에 참여하고 있는지 확인
    const isUserInRoom = chatRoom.users.some((user) => user.id === userId);
    if (!isUserInRoom) {
      throw new Error('해당 채팅방에 참여하고 있지 않습니다.');
    }

    // 사용자를 채팅방에서 제거
    chatRoom.users = chatRoom.users.filter((user) => user.id !== userId);
    await this.chatRoomRepository.save(chatRoom);

    // 채팅방이 비어있는 경우 채팅방 삭제
    if (chatRoom.users.length === 0) {
      await this.chatRoomRepository.remove(chatRoom);
      return { success: true, message: '채팅방이 삭제되었습니다.' };
    }

    return { success: true, message: '채팅방을 나갔습니다.' };
  }

  /**
   * 새로운 채팅 메시지를 저장합니다.
   * @param content 메시지 내용
   * @param user 메시지를 보낸 사용자
   * @param chatRoomId 메시지를 보낼 채팅방 ID
   * @returns 저장된 메시지 정보
   */
  async saveMessage(content: string, user: User, chatRoomId?: string) {
    const message = this.messageRepository.create({
      content,
      user,
      chatRoomId,
    });
    return await this.messageRepository.save(message);
  }

  /**
   * 채팅방에 입장합니다.
   * @param chatRoomId 채팅방 ID
   * @param userId 입장할 사용자 ID
   * @returns 채팅방 정보
   */
  async enterRoom(chatRoomId: string, userId: string) {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['users'],
    });

    if (!chatRoom) {
      throw new Error('채팅방을 찾을 수 없습니다.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const isAlreadyJoined = chatRoom.users.some((u) => u.id === userId);
    if (!isAlreadyJoined) {
      chatRoom.users.push(user);
      await this.chatRoomRepository.save(chatRoom);
    }

    return chatRoom;
  }

  /**
   * 시스템 메시지를 저장합니다.
   * @param content 시스템 메시지 내용
   * @param chatRoomId 채팅방 ID
   * @returns 저장된 시스템 메시지 정보
   */
  async saveSystemMessage(content: string, chatRoomId?: string) {
    const systemUser = await this.userRepository.findOne({
      where: { name: 'System' },
    });
    if (!systemUser) {
      throw new Error('시스템 사용자를 찾을 수 없습니다.');
    }
    const message = this.messageRepository.create({
      content,
      user: systemUser,
      isSystem: true,
      chatRoomId,
    });
    return await this.messageRepository.save(message);
  }

  /**
   * 채팅방에 입장할 때 상대방에게 알림을 보냅니다.
   * @param chatRoomId 채팅방 ID
   * @param currentUserId 현재 사용자 ID
   * @param opponentId 상대방 ID
   */
  async sendChatRoomEntryNotification(
    chatRoomId: string,
    currentUserId: string,
    opponentId: string,
  ): Promise<void> {
    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserId },
    });
    if (!currentUser) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const notification = {
      type: NotificationType.CHAT,
      receiverId: opponentId,
      title: '새로운 채팅방',
      content: `${currentUser.name}님이 채팅방에 입장했습니다.`,
      data: {
        chatRoomId,
        senderId: currentUserId,
      },
    };

    await this.notificationService.create(notification);
  }

  /**
   * 채팅방 접근 권한을 확인합니다.
   * @param userId 사용자 ID
   * @param chatRoomId 채팅방 ID
   * @returns 접근 권한 여부
   */
  async validateChatRoomAccess(
    userId: string,
    chatRoomId: string,
  ): Promise<boolean> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['users'],
    });

    if (!chatRoom) {
      throw new Error('채팅방을 찾을 수 없습니다.');
    }

    // 사용자가 채팅방 참여자인지 확인
    return chatRoom.users.some((user) => user.id === userId);
  }

  /**
   * 채팅방에 메시지를 전송합니다.
   * @param content 메시지 내용
   * @param userId 사용자 ID
   * @param chatRoomId 채팅방 ID
   * @returns 저장된 메시지 정보
   */
  async sendMessage(content: string, userId: string, chatRoomId: string) {
    // 채팅방 접근 권한 확인
    const hasAccess = await this.validateChatRoomAccess(userId, chatRoomId);
    if (!hasAccess) {
      throw new Error('채팅방 접근 권한이 없습니다.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    return this.saveMessage(content, user, chatRoomId);
  }
}

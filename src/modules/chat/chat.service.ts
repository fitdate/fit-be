import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enum/notification.enum';

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
   * @param user1Id 첫 번째 사용자 ID
   * @param user2Id 두 번째 사용자 ID
   * @returns 생성된 채팅방 정보
   */
  async createMatchingRoom(user1Id: string, user2Id: string) {
    const user1 = await this.userRepository.findOne({ where: { id: user1Id } });
    const user2 = await this.userRepository.findOne({ where: { id: user2Id } });

    if (!user1 || !user2) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 기존 채팅방 확인
    const existingRoom = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoin('chatRoom.users', 'user1', 'user1.id = :user1Id', { user1Id })
      .innerJoin('chatRoom.users', 'user2', 'user2.id = :user2Id', { user2Id })
      .getOne();

    if (existingRoom) {
      this.logger.log(`기존 채팅방이 존재합니다: ${existingRoom.id}`);
      return existingRoom;
    }

    const chatRoom = this.chatRoomRepository.create({
      name: `${user1.nickname}님과 ${user2.nickname}님의 채팅방`,
      users: [user1, user2],
    });

    const savedRoom = await this.chatRoomRepository.save(chatRoom);

    await this.sendChatRoomEntryNotification(savedRoom.id, user1Id, user2Id);
    await this.sendChatRoomEntryNotification(savedRoom.id, user2Id, user1Id);

    return savedRoom;
  }

  /**
   * 두 사용자 간의 채팅방을 찾거나 생성합니다.
   * @param user1Id 첫 번째 사용자 ID
   * @param user2Id 두 번째 사용자 ID
   * @returns 채팅방 정보
   */
  private async getOrCreateRoom(user1Id: string, user2Id: string) {
    // 두 사용자 간의 기존 채팅방 찾기
    const existingRoom = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoin('chatRoom.users', 'user1', 'user1.id = :user1Id', { user1Id })
      .innerJoin('chatRoom.users', 'user2', 'user2.id = :user2Id', { user2Id })
      .getOne();

    if (existingRoom) {
      return existingRoom;
    }

    // 채팅방이 없으면 새로 생성
    return this.createMatchingRoom(user1Id, user2Id);
  }

  /**
   * 채팅 페이지에서 대화방 버튼 클릭 시 두 사용자 간의 채팅방을 찾거나 생성합니다.
   * @param user1Id 첫 번째 사용자 ID
   * @param user2Id 두 번째 사용자 ID
   * @returns 채팅방 정보
   */
  async findOrCreateChatRoom(user1Id: string, user2Id: string) {
    const chatRoom = await this.getOrCreateRoom(user1Id, user2Id);

    // 채팅방 입장 알림 전송
    await this.sendChatRoomEntryNotification(chatRoom.id, user1Id, user2Id);

    return chatRoom;
  }

  /**
   * 사용자의 채팅방 목록을 조회합니다.
   * @param userId 조회할 사용자 ID
   * @returns 채팅방 목록 (참여자 정보 포함)
   */
  async getRooms(userId: string) {
    const rooms = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoinAndSelect('chatRoom.users', 'users')
      .where('users.id = :userId', { userId })
      .orderBy('chatRoom.updatedAt', 'DESC')
      .getMany();

    return rooms.map((room) => {
      const partner = room.users.find((user) => user.id !== userId);
      return {
        id: room.id,
        name: room.name,
        user1Id: userId,
        user2Id: partner?.id || null,
        partner: partner
          ? {
              id: partner.id,
              nickname: partner.nickname,
              age: this.calculateAge(partner.birthday),
              height: partner.height,
            }
          : null,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      };
    });
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

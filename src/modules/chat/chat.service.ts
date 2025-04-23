import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enum/notification.enum';

@Injectable()
export class ChatService {
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

    const chatRoom = this.chatRoomRepository.create({
      name: `${user1.name}님과 ${user2.name}님의 채팅방`,
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
    return this.getOrCreateRoom(user1Id, user2Id);
  }

  /**
   * 모든 채팅방 목록을 조회합니다.
   * @returns 채팅방 목록
   */
  async getRooms() {
    return await this.chatRoomRepository.find();
  }

  /**
   * 특정 채팅방의 상세 정보를 조회합니다.
   * @param chatRoomId 조회할 채팅방 ID
   * @returns 채팅방 정보
   */
  async getRoom(chatRoomId: string) {
    return await this.chatRoomRepository.findOne({ where: { id: chatRoomId } });
  }

  /**
   * 특정 채팅방의 참여자 목록을 조회합니다.
   * @param chatRoomId 조회할 채팅방 ID
   * @returns 채팅방 참여자 목록
   */
  async getRoomUsers(chatRoomId: string) {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['users'],
    });
    return chatRoom?.users || [];
  }

  /**
   * 채팅 메시지를 조회합니다.
   * @param chatRoomId 특정 채팅방의 메시지만 조회할 경우 채팅방 ID
   * @returns 채팅 메시지 목록
   */
  async getMessages(chatRoomId?: string) {
    const query = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.user', 'user')
      .orderBy('message.createdAt', 'DESC');

    if (chatRoomId) {
      query.where('message.chatRoomId = :chatRoomId', { chatRoomId });
    }

    return await query.getMany();
  }

  /**
   * 사용자가 채팅방에서 나갑니다.
   * @param chatRoomId 나갈 채팅방 ID
   * @param userId 나가는 사용자 ID
   * @returns 성공 여부
   */
  async exitRoom(chatRoomId: string, userId: string) {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['users'],
    });

    if (!chatRoom) {
      throw new Error('채팅방을 찾을 수 없습니다.');
    }

    chatRoom.users = chatRoom.users.filter((user) => user.id !== userId);
    await this.chatRoomRepository.save(chatRoom);
    return { success: true };
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
    await this.notificationService.create({
      type: NotificationType.CHAT,
      receiverId: opponentId,
      data: {
        chatRoomId,
        senderId: currentUserId,
      },
    });
  }

  /**
   * 알림 메시지의 채팅하기 버튼 클릭 시 채팅방을 생성합니다.
   * @param userId 현재 사용자 ID
   * @param opponentId 상대방 ID
   * @returns 생성된 채팅방 정보
   */
  async createChatRoomFromNotification(userId: string, opponentId: string) {
    return this.getOrCreateRoom(userId, opponentId);
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

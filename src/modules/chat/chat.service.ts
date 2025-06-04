import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enum/notification.enum';
import { calculateAge } from '../../common/util/age-calculator.util';
import { SessionService } from '../session/session.service';

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
    private readonly sessionService: SessionService,
  ) {}

  // 매칭 결과 페이지에서 매칭 성공 시 새로운 채팅방 생성
  async createMatchingRoom(userId: string, partnerId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const partner = await this.userRepository.findOne({
      where: { id: partnerId },
    });

    if (!user || !partner) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const existingRoom = await this.findExistingRoom(userId, partnerId);
    if (existingRoom) {
      return existingRoom;
    }

    const chatRoom = this.chatRoomRepository.create({
      name: `${user.nickname}님과 ${partner.nickname}님의 채팅방`,
      users: [user, partner],
    });

    const savedRoom = await this.chatRoomRepository.save(chatRoom);
    await this.sendChatRoomEntryNotification(savedRoom.id, userId, partnerId);
    await this.sendChatRoomEntryNotification(savedRoom.id, partnerId, userId);

    return savedRoom;
  }

  // 두 사용자 간의 기존 채팅방 조회
  async findExistingRoom(userId: string, partnerId: string) {
    return this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoin('chatRoom.users', 'user1', 'user1.id = :userId', { userId })
      .innerJoin('chatRoom.users', 'user2', 'user2.id = :partnerId', {
        partnerId,
      })
      .getOne();
  }

  // 두 사용자 간의 채팅방 조회 또는 생성
  private async getOrCreateRoom(userId: string, partnerId: string) {
    const existingRoom = await this.findExistingRoom(userId, partnerId);
    if (existingRoom) {
      await this.sendChatRoomEntryNotification(
        existingRoom.id,
        userId,
        partnerId,
      );
      return existingRoom;
    }
    return this.createMatchingRoom(userId, partnerId);
  }

  // 채팅 페이지에서 대화방 버튼 클릭 시 채팅방 조회 또는 생성
  async findOrCreateChatRoom(userId: string, partnerId: string) {
    const chatRoom = await this.getOrCreateRoom(userId, partnerId);
    await this.sendChatRoomEntryNotification(chatRoom.id, userId, partnerId);
    return chatRoom;
  }

  // 커피챗 수락 시 채팅방 생성 및 알림 전송
  async acceptCoffeeChat(userId: string, partnerId: string) {
    const chatRoom = await this.createMatchingRoom(userId, partnerId);
    await this.sendNotification(
      partnerId,
      userId,
      chatRoom.id,
      NotificationType.COFFEE_CHAT_ACCEPT,
      '커피챗 수락',
      '상대방이 커피챗을 수락했습니다. 채팅방에서 대화를 시작해보세요!',
    );
    return { ...chatRoom, isSuccess: true };
  }

  // 매칭 수락 시 채팅방 생성 및 알림 전송
  async acceptMatch(userId: string, partnerId: string) {
    const chatRoom = await this.createMatchingRoom(userId, partnerId);
    await this.sendNotification(
      partnerId,
      userId,
      chatRoom.id,
      NotificationType.MATCH_ACCEPT,
      '매칭 수락',
      '상대방이 매칭을 수락했습니다. 매칭 결과를 확인해보세요!',
    );
    return chatRoom;
  }

  // 날짜를 "오전/오후 HH:mm" 형식으로 변환
  private formatTime(date: Date | undefined): string {
    if (!date) return '';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours < 12 ? '오전' : '오후';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${ampm} ${formattedHours}:${formattedMinutes}`;
  }

  // 알림 전송
  private async sendNotification(
    receiverId: string,
    senderId: string,
    chatRoomId: string,
    type: NotificationType,
    title: string,
    content: string,
  ) {
    const notification = {
      type,
      receiverId,
      title,
      content,
      data: {
        chatRoomId,
        senderId,
        timestamp: this.formatTime(new Date()),
      },
    };
    await this.notificationService.create(notification);
  }

  // 사용자의 채팅방 목록 조회
  async getRooms(userId: string, page: number = 1, pageSize: number = 5) {
    try {
      this.logger.debug(
        `채팅방 목록 조회 시작 - userId: ${userId}, page: ${page}, pageSize: ${pageSize}`,
      );

      // 먼저 사용자의 채팅방 ID 목록을 조회
      const userRooms = await this.chatRoomRepository
        .createQueryBuilder('chatRoom')
        .select('chatRoom.id')
        .innerJoin('chatRoom.users', 'users')
        .where('users.id = :userId', { userId })
        .andWhere('chatRoom.deletedAt IS NULL')
        .getMany();

      this.logger.debug(
        `사용자의 채팅방 ID 목록: ${JSON.stringify(userRooms.map((r) => r.id))}`,
      );

      if (!userRooms.length) {
        this.logger.debug('사용자의 채팅방이 없습니다.');
        return {
          rooms: [],
          totalCount: 0,
          currentPage: page,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        };
      }

      // 전체 채팅방 수 계산
      const totalCount = userRooms.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      // 채팅방 상세 정보 조회 (페이지네이션 적용)
      const rooms = await this.chatRoomRepository
        .createQueryBuilder('chatRoom')
        .innerJoinAndSelect('chatRoom.users', 'users')
        .leftJoinAndSelect('users.profile', 'profile')
        .leftJoinAndSelect('profile.profileImage', 'profileImage')
        .where('chatRoom.id IN (:...roomIds)', {
          roomIds: userRooms.map((room) => room.id),
        })
        .andWhere('chatRoom.deletedAt IS NULL')
        .orderBy('chatRoom.updatedAt', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getMany();

      this.logger.debug(`조회된 채팅방 수: ${rooms.length}`);

      const chatRooms = await Promise.all(
        rooms.map(async (room) => {
          try {
            // 파트너 찾기 (현재 사용자가 아닌 다른 사용자)
            const partner = room.users.find((user) => user.id !== userId);
            if (!partner) {
              this.logger.debug(
                `채팅방 ${room.id}에서 파트너를 찾을 수 없습니다.`,
              );
              return null;
            }

            this.logger.debug(
              `채팅방 ${room.id} 처리 중 - 파트너: ${partner.name}`,
            );

            const mainImage = partner.profile?.profileImage?.find(
              (img) => img.isMain,
            );
            const firstImage = partner.profile?.profileImage?.[0];
            const profileImage =
              mainImage?.imageUrl || firstImage?.imageUrl || null;

            // 마지막 메시지 조회
            const lastMessage = await this.messageRepository
              .createQueryBuilder('message')
              .where('message.chatRoomId = :chatRoomId', {
                chatRoomId: room.id,
              })
              .orderBy('message.createdAt', 'DESC')
              .take(1)
              .getOne();

            // 읽지 않은 메시지 수 조회
            const unreadCount = await this.messageRepository
              .createQueryBuilder('message')
              .where('message.chatRoomId = :chatRoomId', {
                chatRoomId: room.id,
              })
              .andWhere('message.userId != :userId', { userId })
              .andWhere(
                'message."createdAt" > (SELECT COALESCE(MAX(m."createdAt"), :defaultDate) FROM "chat_message" m WHERE m."chatRoomId" = :chatRoomId AND m."userId" = :userId)',
                {
                  chatRoomId: room.id,
                  userId,
                  defaultDate: new Date(0),
                },
              )
              .getCount();

            // 파트너의 온라인 상태 확인
            const isOnline = await this.sessionService.isActiveSession(
              partner.id,
            );

            return {
              id: room.id,
              name: room.name,
              userId: userId,
              partner: {
                id: partner.id,
                name: partner.name,
                age: calculateAge(partner.birthday),
                region: partner.region || null,
                profileImage: profileImage,
                isOnline,
                lastMessage: lastMessage?.content || null,
                lastMessageTime: lastMessage?.createdAt
                  ? this.formatTime(lastMessage.createdAt)
                  : null,
                isUnread: unreadCount > 0,
              },
              createdAt: room.createdAt,
              updatedAt: room.updatedAt,
            };
          } catch (error) {
            this.logger.error(
              `채팅방 ${room.id} 처리 중 오류 발생: ${error instanceof Error ? error.message : error}`,
            );
            return null;
          }
        }),
      );

      const result = chatRooms.filter(Boolean);
      this.logger.debug(`최종 반환되는 채팅방 수: ${result.length}`);

      return {
        rooms: result,
        totalCount,
        currentPage: page,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    } catch (error) {
      this.logger.error(
        `채팅방 목록 조회 중 오류 발생: ${error instanceof Error ? error.message : error}`,
      );
      throw new Error('채팅방 목록을 조회하는 중 오류가 발생했습니다.');
    }
  }

  // 채팅방의 메시지 조회
  async getMessages(chatRoomId: string, userId: string) {
    const hasAccess = await this.validateChatRoomAccess(userId, chatRoomId);
    if (!hasAccess) {
      throw new Error('채팅방 접근 권한이 없습니다.');
    }

    const chatRoom = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoinAndSelect('chatRoom.users', 'users')
      .leftJoinAndSelect('users.profile', 'profile')
      .leftJoinAndSelect('profile.profileImage', 'profileImage')
      .where('chatRoom.id = :chatRoomId', { chatRoomId })
      .getOne();

    if (!chatRoom) {
      throw new Error('채팅방을 찾을 수 없습니다.');
    }

    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.user', 'user')
      .where('message.chatRoomId = :chatRoomId', { chatRoomId })
      .orderBy('message.createdAt', 'DESC')
      .take(50)
      .getMany();

    const partner = chatRoom.users.find((user) => user.id !== userId);
    if (!partner) {
      throw new Error('상대방 정보를 찾을 수 없습니다.');
    }

    const partnerMainImage = partner.profile?.profileImage?.find(
      (img) => img.isMain,
    );
    const partnerFirstImage = partner.profile?.profileImage?.[0];
    const partnerProfileImage =
      partnerMainImage?.imageUrl || partnerFirstImage?.imageUrl || null;

    return {
      chatRoomId,
      partner: {
        id: partner.id,
        name: partner.name,
        profileImage: partnerProfileImage,
      },
      messages: messages.reverse().map((message) => ({
        id: message.id,
        content: message.content,
        userId: message.user.id,
        isMine: message.user.id !== partner.id,
        createdAt: message.createdAt,
      })),
    };
  }

  // 채팅방 나가기
  async exitRoom(chatRoomId: string, userId: string) {
    const chatRoom = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoinAndSelect('chatRoom.users', 'users')
      .where('chatRoom.id = :chatRoomId', { chatRoomId })
      .getOne();

    if (!chatRoom) {
      return { success: false, message: '채팅방을 찾을 수 없습니다.' };
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, message: '사용자를 찾을 수 없습니다.' };
    }

    const isUserInRoom = chatRoom.users.some((u) => u.id === userId);
    if (!isUserInRoom) {
      return { success: false, message: '채팅방에 참여하고 있지 않습니다.' };
    }

    chatRoom.users = chatRoom.users.filter((u) => u.id !== userId);
    await this.chatRoomRepository.save(chatRoom);

    await this.saveSystemMessage(
      `${user.name}님이 채팅방을 나갔습니다.`,
      chatRoomId,
    );

    return { success: true, message: '채팅방을 나갔습니다.' };
  }

  // 채팅 메시지 저장
  async saveMessage(content: string, user: User, chatRoomId?: string) {
    const message = this.messageRepository.create({
      content,
      user,
      chatRoom: chatRoomId ? { id: chatRoomId } : undefined,
    });
    return this.messageRepository.save(message);
  }

  // 채팅방 입장
  async enterRoom(chatRoomId: string, userId: string) {
    const hasAccess = await this.validateChatRoomAccess(userId, chatRoomId);
    if (!hasAccess) {
      throw new Error('채팅방 접근 권한이 없습니다.');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    await this.saveSystemMessage(
      `${user.name}님이 채팅방에 입장하셨습니다.`,
      chatRoomId,
    );

    return { success: true };
  }

  // 시스템 메시지 저장
  async saveSystemMessage(content: string, chatRoomId?: string) {
    const message = this.messageRepository.create({
      content,
      isSystem: true,
      chatRoom: chatRoomId ? { id: chatRoomId } : undefined,
    });
    return this.messageRepository.save(message);
  }

  // 채팅방 입장
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
      title: '채팅방 입장',
      content: `${currentUser.name}님이 채팅방에 입장하셨습니다.`,
      data: {
        chatRoomId,
        senderId: currentUserId,
        timestamp: this.formatTime(new Date()),
      },
    };

    await this.notificationService.create(notification);
  }

  // 채팅방 접근 권한 확인
  async validateChatRoomAccess(
    userId: string,
    chatRoomId: string,
  ): Promise<boolean> {
    const chatRoom = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoin('chatRoom.users', 'user', 'user.id = :userId', { userId })
      .where('chatRoom.id = :chatRoomId', { chatRoomId })
      .andWhere('chatRoom.deletedAt IS NULL')
      .getOne();

    return !!chatRoom;
  }

  // 채팅 메시지 전송
  async sendMessage(content: string, userId: string, chatRoomId: string) {
    const hasAccess = await this.validateChatRoomAccess(userId, chatRoomId);
    if (!hasAccess) {
      throw new Error('채팅방 접근 권한이 없습니다.');
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('profile.profileImage', 'profileImage')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const message = await this.saveMessage(content, user, chatRoomId);
    const mainImage = user.profile?.profileImage?.find((img) => img.isMain);
    const firstImage = user.profile?.profileImage?.[0];
    const profileImage = mainImage?.imageUrl || firstImage?.imageUrl || null;

    return {
      id: message.id,
      content: message.content,
      userId: user.id,
      name: user.name,
      profileImage,
      createdAt: message.createdAt,
    };
  }

  // 채팅방 상대방 정보 조회
  async getChatRoomWithPartner(chatRoomId: string, userId: string) {
    const chatRoom = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoinAndSelect('chatRoom.users', 'users')
      .leftJoinAndSelect('users.profile', 'profile')
      .leftJoinAndSelect('profile.profileImage', 'profileImage')
      .where('chatRoom.id = :chatRoomId', { chatRoomId })
      .getOne();

    if (!chatRoom) {
      throw new Error('채팅방을 찾을 수 없습니다.');
    }

    const partner = chatRoom.users.find((user) => user.id !== userId);
    if (!partner) {
      throw new Error('상대방 정보를 찾을 수 없습니다.');
    }

    const mainImage = partner.profile?.profileImage?.find((img) => img.isMain);
    const firstImage = partner.profile?.profileImage?.[0];
    const partnerProfileImage =
      mainImage?.imageUrl || firstImage?.imageUrl || null;

    return {
      id: partner.id,
      name: partner.name,
      profileImage: partnerProfileImage,
    };
  }
}

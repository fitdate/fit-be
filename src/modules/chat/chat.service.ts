import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enum/notification.enum';
import { calculateAge } from '../../common/util/age-calculator.util';

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
  private async findExistingRoom(userId: string, partnerId: string) {
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
      NotificationType.COFFEE_CHAT,
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
      NotificationType.MATCH,
      '매칭 수락',
      '상대방이 매칭을 수락했습니다. 채팅방에서 대화를 시작해보세요!',
    );
    return { ...chatRoom, isSuccess: true };
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
  async getRooms(userId: string) {
    const rooms = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoinAndSelect('chatRoom.users', 'users', 'users.id != :userId', {
        userId,
      })
      .leftJoinAndSelect('users.profile', 'profile')
      .leftJoinAndSelect(
        'profile.profileImage',
        'profileImage',
        'profileImage.isMain = :isMain',
        { isMain: true },
      )
      .where(
        'EXISTS (SELECT 1 FROM chat_room_users WHERE chat_room_id = chatRoom.id AND user_id = :userId)',
        { userId },
      )
      .andWhere('chatRoom.deletedAt IS NULL')
      .orderBy('chatRoom.updatedAt', 'DESC')
      .getMany();

    return rooms
      .map((room) => {
        const partner = room.users[0];
        if (!partner) return null;

        const mainImage = partner.profile?.profileImage?.find(
          (img) => img.isMain,
        );
        const firstImage = partner.profile?.profileImage?.[0];
        const profileImage =
          mainImage?.imageUrl || firstImage?.imageUrl || null;

        return {
          id: room.id,
          name: room.name,
          userId: userId,
          partner: {
            id: partner.id,
            name: partner.name,
            age: calculateAge(partner.birthday),
            height: partner.height || null,
            profileImage,
          },
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        };
      })
      .filter(Boolean);
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
      userName: user.name,
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

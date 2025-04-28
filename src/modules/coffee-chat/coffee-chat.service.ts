import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CoffeeChat } from './entities/coffee-chat.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserService } from '../user/user.service';
import { SendCoffeeChatDto } from './dto/send-coffee-chat.dto';
import { CoffeeChatStatus } from './enum/coffee-chat-statue.enum';
import { DataSource } from 'typeorm';
import { AcceptedCoffeeChat } from './entities/accepted-coffee-chat.entity';
import { CoffeeChatReturn, UserSummary } from './types/coffee-chat.types';
import { ChatService } from '../chat/chat.service';
import { NotificationType } from 'src/common/enum/notification.enum';
import { NotificationService } from 'src/modules/notification/notification.service';
import { calculateAge } from 'src/common/util/age-calculator.util';
import { User } from '../user/entities/user.entity';

@Injectable()
export class CoffeeChatService {
  private readonly logger = new Logger(CoffeeChatService.name);

  constructor(
    @InjectRepository(CoffeeChat)
    private coffeeChatRepository: Repository<CoffeeChat>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    @InjectRepository(AcceptedCoffeeChat)
    private acceptedCoffeeChatRepository: Repository<AcceptedCoffeeChat>,
    private readonly chatService: ChatService,
    private readonly notificationService: NotificationService,
  ) {}

  async sendCoffeeChat(
    userId: string,
    sendCoffeeChatDto: SendCoffeeChatDto,
  ): Promise<{
    savedCoffeeChat: {
      id: string;
      sender: string;
      receiver: string;
      status: CoffeeChatStatus;
    };
  }> {
    this.logger.log(
      `Starting coffee chat request - Sender: ${userId}, Receiver: ${sendCoffeeChatDto.receiverId}`,
    );

    // 중복 요청 방지
    const existingChat = await this.coffeeChatRepository.findOne({
      where: {
        sender: { id: userId },
        receiver: { id: sendCoffeeChatDto.receiverId },
        status: CoffeeChatStatus.PENDING,
      },
    });

    if (existingChat) {
      this.logger.warn(
        `Duplicate coffee chat request detected - Sender: ${userId}, Receiver: ${sendCoffeeChatDto.receiverId}`,
      );
      throw new BadRequestException('이미 요청된 커피챗이 존재합니다.');
    }

    return this.dataSource.transaction(async (manager) => {
      const sender = await this.userService.getCoffeeChatUserById(userId);
      const receiver = await this.userService.getCoffeeChatUserById(
        sendCoffeeChatDto.receiverId,
      );

      this.logger.log(
        `Retrieved users - Sender: ${sender.nickname}, Receiver: ${receiver.nickname}`,
      );

      if (sender.coffee < 10) {
        this.logger.warn(
          `Insufficient coffee for user ${sender.nickname} - Current: ${sender.coffee}`,
        );
        throw new BadRequestException('커피가 부족합니다.');
      }

      sender.coffee -= 10;
      await manager.save(sender);

      const coffeeChat = this.coffeeChatRepository.create({
        sender,
        receiver,
        status: CoffeeChatStatus.PENDING,
      });

      const savedCoffeeChat = await manager.save(coffeeChat);

      this.logger.log(
        `Coffee chat request saved - ID: ${savedCoffeeChat.id}, Sender: ${sender.nickname}, Receiver: ${receiver.nickname}`,
      );

      return {
        savedCoffeeChat: {
          id: savedCoffeeChat.id,
          sender: sender.id,
          receiver: receiver.id,
          status: savedCoffeeChat.status,
        },
      };
    });
  }

  async acceptCoffeeChat(userId: string, senderId: string) {
    this.logger.log(
      `Processing coffee chat acceptance - User: ${userId}, Sender: ${senderId}`,
    );

    const chat = await this.coffeeChatRepository.findOne({
      where: { id: senderId },
      relations: ['receiver', 'sender'],
    });

    if (!chat || chat.receiver.id !== userId) {
      this.logger.warn(
        `Invalid coffee chat acceptance attempt - Chat ID: ${senderId}, User ID: ${userId}`,
      );
      throw new BadRequestException('유효하지 않은 커피챗 요청입니다.');
    }

    const acceptedChat = await this.dataSource.transaction(async (manager) => {
      const createdChatRoom = await this.chatService.createMatchingRoom(
        userId,
        chat.sender.id,
      );

      this.logger.log(
        `Created chat room for coffee chat - Room ID: ${createdChatRoom.id}`,
      );

      const acceptedChat = manager.create(AcceptedCoffeeChat, {
        sender: chat.sender,
        receiver: chat.receiver,
        acceptedAt: new Date(),
      });
      await manager.save(acceptedChat);

      await manager.remove(chat);

      return { acceptedChat, createdChatRoom };
    });

    // 트랜잭션 외부에서 알림 전송
    const notification = {
      type: NotificationType.COFFEE_CHAT,
      receiverId: senderId,
      title: '커피챗 수락',
      content:
        '상대방이 커피챗을 수락했습니다. 채팅방에서 대화를 시작해보세요!',
      data: {
        chatRoomId: acceptedChat.createdChatRoom.id,
        senderId: userId,
      },
    };

    try {
      await this.notificationService.create(notification);
      this.logger.log(
        `Sent acceptance notification to sender - ID: ${senderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending notification: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }

    return {
      createdChatRoom: {
        id: acceptedChat.createdChatRoom.id,
        sender: chat.sender.id,
        receiver: chat.receiver.id,
      },
      acceptedChat: acceptedChat.acceptedChat,
    };
  }

  async getCoffeeChatList(userId: string) {
    this.logger.log(`Fetching coffee chat list for user - ID: ${userId}`);
    const coffeeChatList = await this.coffeeChatRepository
      .createQueryBuilder('coffeeChat')
      .leftJoinAndSelect('coffeeChat.receiver', 'receiver')
      .leftJoinAndSelect('receiver.profile', 'receiverProfile')
      .leftJoinAndSelect('receiverProfile.profileImage', 'receiverProfileImage')
      .where('receiver.id = :userId', { userId })
      .orderBy('coffeeChat.createdAt', 'DESC')
      .getMany();

    this.logger.log(
      `Retrieved ${coffeeChatList.length} coffee chats for user ${userId}`,
    );
    return coffeeChatList;
  }

  async getReceivedCoffeeChatList(userId: string): Promise<any[]> {
    this.logger.log(`[받은 커피챗 조회] 사용자 ID: ${userId}`);
    // Pending chats
    const pendingChats = await this.coffeeChatRepository
      .createQueryBuilder('coffeeChat')
      .leftJoinAndSelect('coffeeChat.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'senderProfile')
      .leftJoinAndSelect('senderProfile.profileImage', 'senderProfileImage')
      .where('coffeeChat.receiverId = :userId', { userId })
      .andWhere('coffeeChat.status = :status', { status: CoffeeChatStatus.PENDING })
      .orderBy('coffeeChat.createdAt', 'DESC')
      .getMany();

    const pendingChatsReceiver = await this.coffeeChatRepository
      .createQueryBuilder('coffeeChat')
      .leftJoinAndSelect('coffeeChat.receiver', 'receiver')
      .leftJoinAndSelect('receiver.profile', 'receiverProfile')
      .leftJoinAndSelect('receiverProfile.profileImage', 'receiverProfileImage')
      .where('coffeeChat.senderId = :userId', { userId })
      .andWhere('coffeeChat.status = :status', { status: CoffeeChatStatus.PENDING })
      .orderBy('coffeeChat.createdAt', 'DESC')
      .getMany();

    // Accepted chats
    const acceptedChats = await this.acceptedCoffeeChatRepository
      .createQueryBuilder('acceptedChat')
      .leftJoinAndSelect('acceptedChat.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'senderProfile')
      .leftJoinAndSelect('senderProfile.profileImage', 'senderProfileImage')
      .leftJoinAndSelect('acceptedChat.receiver', 'receiver')
      .leftJoinAndSelect('receiver.profile', 'receiverProfile')
      .leftJoinAndSelect('receiverProfile.profileImage', 'receiverProfileImage')
      .where('acceptedChat.receiver.id = :userId', { userId })
      .orderBy('acceptedChat.acceptedAt', 'DESC')
      .getMany();

    const pendingResult = pendingChats.map(chat => ({
      ...this.coffeeChatReturn([chat])[0],
      status: CoffeeChatStatus.PENDING,
    }));
    const acceptedResult = acceptedChats.map(chat => ({
      ...this.coffeeChatReturn([chat], true)[0],
      status: CoffeeChatStatus.ACCEPTED,
    }));

    const result = [...pendingResult, ...pendingChatsReceiver, ...acceptedResult];
    this.logger.log(
      `[받은 커피챗 조회 완료] 사용자 ID: ${userId}, 조회된 커피챗 수: ${result.length}`,
    );
    return result;
  }

  async getAcceptedCoffeeChatList(userId: string): Promise<CoffeeChatReturn[]> {
    this.logger.log(
      `Fetching accepted coffee chat list for user - ID: ${userId}`,
    );
    const acceptedCoffeeChatList = await this.acceptedCoffeeChatRepository
      .createQueryBuilder('acceptedChat')
      .leftJoinAndSelect('acceptedChat.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'senderProfile')
      .leftJoinAndSelect('senderProfile.profileImage', 'senderProfileImage')
      .leftJoinAndSelect('acceptedChat.receiver', 'receiver')
      .leftJoinAndSelect('receiver.profile', 'receiverProfile')
      .leftJoinAndSelect('receiverProfile.profileImage', 'receiverProfileImage')
      .where('receiver.id = :userId', { userId })
      .orderBy('acceptedChat.acceptedAt', 'DESC')
      .getMany();

    this.logger.log(
      `Retrieved ${acceptedCoffeeChatList.length} accepted coffee chats for user ${userId}`,
    );
    return this.coffeeChatReturn(acceptedCoffeeChatList, true);
  }

  async getSentCoffeeChatList(userId: string): Promise<CoffeeChatReturn[]> {
    this.logger.log(`Fetching sent coffee chat list for user - ID: ${userId}`);
    const sentCoffeeChatList = await this.coffeeChatRepository
      .createQueryBuilder('coffeeChat')
      .leftJoinAndSelect('coffeeChat.receiver', 'receiver')
      .leftJoinAndSelect('receiver.profile', 'receiverProfile')
      .leftJoinAndSelect('receiverProfile.profileImage', 'receiverProfileImage')
      .where('coffeeChat.sender.id = :userId', { userId })
      .orderBy('coffeeChat.createdAt', 'DESC')
      .getMany();

    this.logger.log(
      `Retrieved ${sentCoffeeChatList.length} sent coffee chats for user ${userId}`,
    );
    return this.coffeeChatReturn(sentCoffeeChatList);
  }

  private createUserSummary(user: User): UserSummary {
    return {
      id: user.id ?? '',
      nickname: user.nickname,
      region: user.region ?? '',
      likeCount: user.likeCount,
      age: calculateAge(user.birthday),
      profileImage: user.profile?.profileImage?.[0]?.imageUrl ?? null,
    };
  }

  coffeeChatReturn(
    chats: (CoffeeChat | AcceptedCoffeeChat)[],
    includeAcceptedAt = false,
  ): CoffeeChatReturn[] {
    return chats.map((chat) => {
      const sender = chat.sender
        ? this.createUserSummary(chat.sender)
        : undefined;
      const receiver = chat.receiver
        ? this.createUserSummary(chat.receiver)
        : undefined;
      const base = { sender, receiver };
      if (includeAcceptedAt && 'acceptedAt' in chat && chat.acceptedAt) {
        return { ...base, acceptedAt: chat.acceptedAt };
      }
      return base;
    });
  }
}

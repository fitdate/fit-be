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
      this.logger.log(
        `Deducted coffee from sender ${sender.nickname} - New balance: ${sender.coffee}`,
      );

      const coffeeChat = manager.create(CoffeeChat, {
        sender,
        receiver: receiver,
        status: CoffeeChatStatus.PENDING,
      });

      const savedCoffeeChat = await manager.save(coffeeChat);
      this.logger.log(
        `Created new coffee chat request - ID: ${savedCoffeeChat.id}`,
      );

      //send message to receiver
      const chatRoomEntryNotification =
        await this.chatService.sendChatRoomEntryNotification(
          savedCoffeeChat.id,
          userId,
          receiver.id,
        );
      const receiverChatRoomEntryNotification =
        await this.chatService.sendChatRoomEntryNotification(
          savedCoffeeChat.id,
          receiver.id,
          userId,
        );
      return {
        savedCoffeeChat: {
          id: savedCoffeeChat.id,
          sender: sender.id,
          receiver: receiver.id,
          status: savedCoffeeChat.status,
        },
        chatRoomEntryNotification,
        receiverChatRoomEntryNotification,
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
        `Invalid coffee chat acceptance attempt - Chat not found or wrong receiver`,
      );
      throw new Error('상대가 커피챗을 수락하지 않았거나 존재하지 않습니다.');
    }

    this.logger.log(`Found valid coffee chat request - ID: ${chat.id}`);

    // 메시지 전송 + 채팅방 생성 로직
    const createdChatRoom = await this.chatService.createMatchingRoom(
      userId,
      chat.sender.id,
    );

    this.logger.log(
      `Created chat room for coffee chat - Room ID: ${createdChatRoom.id}`,
    );

    // 상태를 ACCEPTED로 업데이트
    chat.status = CoffeeChatStatus.ACCEPTED;
    await this.coffeeChatRepository.save(chat);
    this.logger.log(`Updated coffee chat status to ACCEPTED - ID: ${chat.id}`);

    // 커피챗 수락 알림 전송
    const notification = {
      type: NotificationType.COFFEE_CHAT,
      receiverId: senderId,
      title: '커피챗 수락',
      content:
        '상대방이 커피챗을 수락했습니다. 채팅방에서 대화를 시작해보세요!',
      data: {
        chatRoomId: createdChatRoom.id,
        senderId: userId,
      },
    };

    const sentNotification =
      await this.notificationService.create(notification);
    this.logger.log(`Sent acceptance notification to sender - ID: ${senderId}`);

    // 수락한 커피챗 삭제
    const removedCoffeeChat = await this.coffeeChatRepository.remove(chat);
    this.logger.log(`Removed pending coffee chat - ID: ${chat.id}`);

    const acceptedChat = this.acceptedCoffeeChatRepository.create({
      sender: chat.sender,
      receiver: chat.receiver,
      acceptedAt: new Date(),
    });
    await this.acceptedCoffeeChatRepository.save(acceptedChat);
    this.logger.log(
      `Created accepted coffee chat record - ID: ${acceptedChat.id}`,
    );

    return {
      createdChatRoom: {
        id: createdChatRoom.id,
        sender: chat.sender.id,
        receiver: chat.receiver.id,
      },
      sentNotification,
      removedCoffeeChat,
      acceptedChat,
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

  async getReceivedCoffeeChatList(userId: string): Promise<CoffeeChatReturn[]> {
    this.logger.log(
      `Fetching received coffee chat list for user - ID: ${userId}`,
    );
    const receivedCoffeeChatList = await this.coffeeChatRepository
      .createQueryBuilder('coffeeChat')
      .leftJoinAndSelect('coffeeChat.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'senderProfile')
      .leftJoinAndSelect('senderProfile.profileImage', 'senderProfileImage')
      .where('coffeeChat.receiver.id = :userId', { userId })
      .andWhere('coffeeChat.status = :status', {
        status: CoffeeChatStatus.PENDING,
      })
      .orderBy('coffeeChat.createdAt', 'DESC')
      .getMany();

    this.logger.log(
      `Retrieved ${receivedCoffeeChatList.length} pending coffee chats for user ${userId}`,
    );
    return this.coffeeChatReturn(receivedCoffeeChatList);
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
      .where('sender.id = :userId OR receiver.id = :userId', { userId })
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

  coffeeChatReturn(
    chats: (CoffeeChat | AcceptedCoffeeChat)[],
    includeAcceptedAt = false,
  ): CoffeeChatReturn[] {
    return chats.map((chat: CoffeeChat | AcceptedCoffeeChat) => {
      const sender = chat.sender
        ? ({
            id: chat.sender.id,
            nickname: chat.sender.nickname,
            region: chat.sender.region,
            likeCount: chat.sender.likeCount,
            age: calculateAge(chat.sender.birthday),
            profileImage:
              chat.sender.profile?.profileImage?.[0]?.imageUrl ?? null,
          } as UserSummary)
        : undefined;
      const receiver = chat.receiver
        ? ({
            id: chat.receiver.id,
            nickname: chat.receiver.nickname,
            region: chat.receiver.region,
            likeCount: chat.receiver.likeCount,
            age: calculateAge(chat.receiver.birthday),
            profileImage:
              chat.receiver.profile?.profileImage?.[0]?.imageUrl ?? null,
          } as UserSummary)
        : undefined;
      const base = { sender, receiver };
      if (includeAcceptedAt && 'acceptedAt' in chat && chat.acceptedAt) {
        return { ...base, acceptedAt: chat.acceptedAt };
      }
      return base;
    });
  }
}

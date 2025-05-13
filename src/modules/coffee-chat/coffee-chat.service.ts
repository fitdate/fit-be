import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CoffeeChat } from './entities/coffee-chat.entity';
import { Repository, EntityManager } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserService } from '../user/user.service';
import { CoffeeChatStatus } from './enum/coffee-chat-statue.enum';
import { DataSource } from 'typeorm';
import { AcceptedCoffeeChat } from './entities/accepted-coffee-chat.entity';
import { ChatService } from '../chat/chat.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { CreateNotificationDto } from 'src/modules/notification/dto/create-notification.dto';
import { NotificationType } from 'src/common/enum/notification.enum';
import { AcceptCoffeeChatDto } from './dto/accept-coffee-chat.dto';
import { User } from '../user/entities/user.entity';
import { ChatRoom } from '../chat/entities/chat-room.entity';

interface CoffeeChatResponse {
  senderId: string;
  receiverId: string;
  coffeeChatId?: string;
  chatRoomId?: string;
  type: NotificationType;
  status: CoffeeChatStatus;
}

interface CoffeeChatUser extends User {
  coffee: number;
  nickname: string;
}

@Injectable()
export class CoffeeChatService {
  private readonly logger = new Logger(CoffeeChatService.name);
  private readonly REQUIRED_COFFEE = 10;

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

  // 커피챗 요청
  async sendCoffeeChat(
    userId: string,
    notificationDto: CreateNotificationDto,
  ): Promise<CoffeeChatResponse> {
    this.logger.log(
      `Starting coffee chat request - Sender: ${userId}, Receiver: ${notificationDto.receiverId}`,
    );

    await this.validateCoffeeChatRequest(userId, notificationDto.receiverId);

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const { sender, receiver } = await this.getUsersForCoffeeChat(
        userId,
        notificationDto.receiverId,
      );

      await this.validateAndDeductCoffee(sender, manager);

      const coffeeChat = await this.createAndSaveCoffeeChat(
        sender,
        receiver,
        manager,
      );

      await this.sendNotification(notificationDto, receiver.id);

      return this.createCoffeeChatResponse(sender, receiver, coffeeChat);
    });
  }

  // 커피챗 요청 유효성 검사
  private async validateCoffeeChatRequest(
    userId: string,
    receiverId: string,
  ): Promise<void> {
    if (userId === receiverId) {
      throw new BadRequestException('자기 자신에게 커피챗을 보낼 수 없습니다.');
    }

    const existingChat = await this.findExistingPendingChat(userId, receiverId);
    if (existingChat) {
      throw new BadRequestException('이미 요청된 커피챗이 존재합니다.');
    }

    const existingRoom = await this.chatService.findExistingRoom(
      userId,
      receiverId,
    );
    if (existingRoom) {
      throw new BadRequestException('이미 채팅방이 존재하는 사용자입니다.');
    }
  }

  private async findExistingPendingChat(
    senderId: string,
    receiverId: string,
  ): Promise<CoffeeChat | null> {
    return this.coffeeChatRepository.findOne({
      where: {
        sender: { id: senderId },
        receiver: { id: receiverId },
        status: CoffeeChatStatus.PENDING,
      },
    });
  }

  // 커피챗 요청 유저 조회
  private async getUsersForCoffeeChat(
    senderId: string,
    receiverId: string,
  ): Promise<{ sender: CoffeeChatUser; receiver: CoffeeChatUser }> {
    const [sender, receiver] = await Promise.all([
      this.userService.getCoffeeChatUserById(senderId),
      this.userService.getCoffeeChatUserById(receiverId),
    ]);

    this.logger.log(
      `Retrieved users - Sender: ${sender.nickname}, Receiver: ${receiver.nickname}`,
    );

    return { sender, receiver };
  }

  // 커피챗 요청 유저 커피 검사 및 차감
  private async validateAndDeductCoffee(
    sender: CoffeeChatUser,
    manager: EntityManager,
  ): Promise<void> {
    if (sender.coffee < this.REQUIRED_COFFEE) {
      this.logger.warn(
        `Insufficient coffee for user ${sender.nickname} - Current: ${sender.coffee}`,
      );
      throw new BadRequestException('커피가 부족합니다.');
    }

    sender.coffee -= this.REQUIRED_COFFEE;
    await manager.save(sender);
  }

  // 커피챗 요청 저장
  private async createAndSaveCoffeeChat(
    sender: CoffeeChatUser,
    receiver: CoffeeChatUser,
    manager: EntityManager,
  ): Promise<CoffeeChat> {
    const coffeeChat = this.coffeeChatRepository.create({
      sender,
      receiver,
      status: CoffeeChatStatus.PENDING,
    });

    const savedCoffeeChat = await manager.save(coffeeChat);
    this.logger.log(
      `Coffee chat request saved - ID: ${savedCoffeeChat.id}, Sender: ${sender.nickname}, Receiver: ${receiver.nickname}`,
    );

    return savedCoffeeChat;
  }

  // 커피챗 요청 알림 전송
  private async sendNotification(
    notificationDto: CreateNotificationDto,
    receiverId: string,
  ): Promise<void> {
    await this.notificationService.create({
      receiverId,
      title: notificationDto.title,
      content: notificationDto.content,
      type: NotificationType.COFFEE_CHAT_REQUEST,
      data: notificationDto.data,
    });
  }

  // 커피챗 요청 응답 생성
  private createCoffeeChatResponse(
    sender: CoffeeChatUser,
    receiver: CoffeeChatUser,
    coffeeChat: CoffeeChat,
  ): CoffeeChatResponse {
    return {
      senderId: sender.id,
      receiverId: receiver.id,
      coffeeChatId: coffeeChat.id,
      type: NotificationType.COFFEE_CHAT_REQUEST,
      status: coffeeChat.status,
    };
  }

  // 커피챗 요청 수락
  async acceptCoffeeChat(
    userId: string,
    acceptCoffeeChatDto: AcceptCoffeeChatDto,
  ): Promise<CoffeeChatResponse> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const coffeeChat = await this.findAndValidateCoffeeChat(
        acceptCoffeeChatDto.coffeeChatId,
        userId,
        manager,
      );

      const chatRoom = await this.processCoffeeChatAcceptance(
        coffeeChat,
        manager,
      );

      return {
        senderId: coffeeChat.sender.id,
        receiverId: coffeeChat.receiver.id,
        chatRoomId: chatRoom.id,
        type: NotificationType.COFFEE_CHAT_ACCEPT,
        status: CoffeeChatStatus.ACCEPTED,
      };
    });
  }

  // 커피챗 요청 조회 및 유효성 검사
  private async findAndValidateCoffeeChat(
    coffeeChatId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<CoffeeChat> {
    const coffeeChat = await manager.findOne(CoffeeChat, {
      where: {
        id: coffeeChatId,
        receiver: { id: userId },
      },
      relations: ['sender', 'receiver'],
    });

    if (!coffeeChat) {
      throw new BadRequestException('커피챗 요청이 존재하지 않습니다.');
    }

    return coffeeChat;
  }

  // 커피챗 요청 수락 처리
  private async processCoffeeChatAcceptance(
    coffeeChat: CoffeeChat,
    manager: EntityManager,
  ): Promise<ChatRoom> {
    coffeeChat.status = CoffeeChatStatus.ACCEPTED;
    await manager.save(CoffeeChat, coffeeChat);

    const chatRoom = await this.chatService.acceptCoffeeChat(
      coffeeChat.sender.id,
      coffeeChat.receiver.id,
    );

    await manager.remove(CoffeeChat, coffeeChat);
    return chatRoom;
  }

  // 커피챗 요청 거절
  async removeCoffeeChat(userId: string, passedUserId: string): Promise<void> {
    if (!passedUserId) {
      throw new BadRequestException('receiverId가 없습니다.');
    }

    const result = await this.coffeeChatRepository.delete({
      sender: { id: passedUserId },
      receiver: { id: userId },
      status: CoffeeChatStatus.PENDING,
    });

    if (result.affected === 0) {
      this.logger.warn(
        `거절할 커피챗이 존재하지 않습니다. sender: ${passedUserId}, receiver: ${userId}`,
      );
      throw new BadRequestException('거절할 커피챗이 존재하지 않습니다.');
    }

    this.logger.log(
      `커피챗 거절 완료 - sender: ${passedUserId}, receiver: ${userId}`,
    );
  }

  // 커피챗 요청 수신 목록 조회
  async getReceivedCoffeeChatList(userId: string): Promise<CoffeeChat[]> {
    const [pendingChats, pendingChatsReceiver] = await Promise.all([
      this.findPendingChatsByReceiver(userId),
      this.findPendingChatsBySender(userId),
    ]);

    return [...pendingChats, ...pendingChatsReceiver];
  }

  // 커피챗 요청 수신 목록 조회
  private async findPendingChatsByReceiver(
    userId: string,
  ): Promise<CoffeeChat[]> {
    return this.coffeeChatRepository.find({
      where: { receiver: { id: userId }, status: CoffeeChatStatus.PENDING },
      relations: [
        'sender',
        'receiver',
        'sender.profile',
        'sender.profile.profileImage',
        'receiver.profile',
        'receiver.profile.profileImage',
      ],
    });
  }

  // 커피챗 요청 발신 목록 조회
  private async findPendingChatsBySender(
    userId: string,
  ): Promise<CoffeeChat[]> {
    return this.coffeeChatRepository.find({
      where: { sender: { id: userId }, status: CoffeeChatStatus.PENDING },
      relations: [
        'sender',
        'receiver',
        'sender.profile',
        'sender.profile.profileImage',
        'receiver.profile',
        'receiver.profile.profileImage',
      ],
    });
  }
}

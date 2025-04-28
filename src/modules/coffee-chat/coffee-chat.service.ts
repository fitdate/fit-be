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

  async getReceivedCoffeeChatList(userId: string) {
    // 수신한 커피챗 요청
    const pendingChats = await this.coffeeChatRepository.find({
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

    // 보낸 커피챗 요청
    const pendingChatsReceiver = await this.coffeeChatRepository.find({
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

    // 두 결과를 합쳐 반환
    return [...pendingChats, ...pendingChatsReceiver];
  }
}

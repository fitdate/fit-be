import { BadRequestException, Injectable } from '@nestjs/common';
import { CoffeeChat } from './entities/coffee-chat.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserService } from '../user/user.service';
import { SendCoffeeChatDto } from './dto/send-coffee-chat.dto';
import { CoffeeChatStatus } from './enum/coffee-chat-statue.enum';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { AcceptedCoffeeChat } from './entities/accepted-coffee-chat.entity';
import { CoffeeChatReturn, UserSummary } from './types/coffee-chat.types';
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
  ) {}
  async sendCoffeeChat(
    userId: string,
    sendCoffeeChatDto: SendCoffeeChatDto,
  ): Promise<CoffeeChat> {
    return this.dataSource.transaction(async (manager) => {
      const sender = await this.userService.getCoffeeChatUserById(userId);
      const receiver = await this.userService.getCoffeeChatUserById(
        sendCoffeeChatDto.receiverId,
      );

      if (sender.coffee < 10) {
        throw new BadRequestException('커피가 부족합니다.');
      }

      sender.coffee -= 10;
      await manager.save(sender);

      const coffeeChat = manager.create(CoffeeChat, {
        sender,
        receiver: receiver,
        status: CoffeeChatStatus.PENDING,
      });

      const savedCoffeeChat = await manager.save(coffeeChat);

      //send message to receiver

      return savedCoffeeChat;
    });
  }

  async acceptCoffeeChat(userId: string, senderId: string) {
    const chat = await this.coffeeChatRepository.findOne({
      where: { id: senderId },
      relations: ['receiver', 'sender'],
    });

    if (!chat || chat.receiver.id !== userId) {
      throw new Error('상대가 커피챗을 수락하지 않았거나 존재하지 않습니다.');
    }

    // 메시지 전송 + 채팅방 생성 로직

    // 상태를 ACCEPTED로 업데이트
    chat.status = CoffeeChatStatus.ACCEPTED;
    await this.coffeeChatRepository.save(chat);

    // 수락한 커피챗 삭제
    await this.coffeeChatRepository.remove(chat);
    const acceptedChat = this.acceptedCoffeeChatRepository.create({
      sender: chat.sender,
      receiver: chat.receiver,
      acceptedAt: new Date(),
    });
    await this.acceptedCoffeeChatRepository.save(acceptedChat);

    this.logger.debug(`Coffee chat with ID ${chat.id} has been deleted.`);
  }

  async getCoffeeChatList(userId: string) {
    const coffeeChatList = await this.coffeeChatRepository
      .createQueryBuilder('coffeeChat')
      .leftJoinAndSelect('coffeeChat.receiver', 'receiver')
      .leftJoinAndSelect('receiver.profile', 'receiverProfile')
      .leftJoinAndSelect('receiverProfile.profileImage', 'receiverProfileImage')
      .where('receiver.id = :userId', { userId })
      .orderBy('coffeeChat.createdAt', 'DESC')
      .getMany();

    return coffeeChatList;
  }

  async getReceivedCoffeeChatList(userId: string): Promise<CoffeeChatReturn[]> {
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

    return this.coffeeChatReturn(receivedCoffeeChatList);
  }

  async getAcceptedCoffeeChatList(userId: string): Promise<CoffeeChatReturn[]> {
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

    return this.coffeeChatReturn(acceptedCoffeeChatList, true);
  }

  async getSentCoffeeChatList(userId: string): Promise<CoffeeChatReturn[]> {
    const sentCoffeeChatList = await this.coffeeChatRepository
      .createQueryBuilder('coffeeChat')
      .leftJoinAndSelect('coffeeChat.receiver', 'receiver')
      .leftJoinAndSelect('receiver.profile', 'receiverProfile')
      .leftJoinAndSelect('receiverProfile.profileImage', 'receiverProfileImage')
      .where('coffeeChat.sender.id = :userId', { userId })
      .orderBy('coffeeChat.createdAt', 'DESC')
      .getMany();

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
            age: chat.sender.age,
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
            age: chat.receiver.age,
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

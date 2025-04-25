import { BadRequestException, Injectable } from '@nestjs/common';
import { CoffeeChat } from './entities/coffee-chat.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserService } from '../user/user.service';
import { SendCoffeeChatDto } from './dto/send-coffee-chat.dto';
import { CoffeeChatStatus } from './enum/coffee-chat-statue.enum';
import { DataSource } from 'typeorm';

@Injectable()
export class CoffeeChatService {
  constructor(
    @InjectRepository(CoffeeChat)
    private coffeeChatRepository: Repository<CoffeeChat>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
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
      relations: ['receiver'],
    });

    if (!chat || chat.receiver.id !== userId) {
      throw new Error('상대가 커피챗을 수락하지 않았거나 존재하지 않않습니다.');
    }

    //send message to sender
    //create chat room

    chat.status = CoffeeChatStatus.ACCEPTED;
    await this.coffeeChatRepository.save(chat);
  }

  async getCoffeeChatList(userId: string) {
    const coffeeChatList = await this.coffeeChatRepository
      .createQueryBuilder('coffeeChat')
      .leftJoinAndSelect('coffeeChat.receiver', 'receiver')
      .leftJoinAndSelect('receiver.profile', 'receiverProfile')
      .leftJoinAndSelect('receiverProfile.profileImage', 'receiverProfileImage')
      .where('receiver.id = :userId', { userId })
      .getMany();

    return coffeeChatList;
  }
}

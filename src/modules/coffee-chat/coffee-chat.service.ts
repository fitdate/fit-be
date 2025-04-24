import { Injectable } from '@nestjs/common';
import { CoffeeChat } from './entities/coffee-chat.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserService } from '../user/user.service';
import { SendCoffeeChatDto } from './dto/send-coffee-chat.dto';
import { CoffeeChatStatus } from './enum/coffee-chat-statue.enum';

@Injectable()
export class CoffeeChatService {
  constructor(
    @InjectRepository(CoffeeChat)
    private coffeeChatRepository: Repository<CoffeeChat>,
    private readonly userService: UserService,
  ) {}
  async sendCoffeeChat(
    userId: string,
    sendCoffeeChatDto: SendCoffeeChatDto,
  ): Promise<CoffeeChat> {
    const sender = await this.userService.getCoffeeChatUserById(userId);
    const receiver = await this.userService.getCoffeeChatUserById(
      sendCoffeeChatDto.receiverId,
    );

    const coffeeChat = this.coffeeChatRepository.create({
      sender,
      receiver: receiver,
      status: CoffeeChatStatus.PENDING,
    });

    //send message to receiver

    return await this.coffeeChatRepository.save(coffeeChat);
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
}

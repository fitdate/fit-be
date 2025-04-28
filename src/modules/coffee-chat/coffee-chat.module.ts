import { Module } from '@nestjs/common';
import { CoffeeChatService } from './coffee-chat.service';
import { CoffeeChatController } from './coffee-chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoffeeChat } from './entities/coffee-chat.entity';
import { UserModule } from '../user/user.module';
import { AcceptedCoffeeChat } from './entities/accepted-coffee-chat.entity';
import { ChatModule } from '../chat/chat.module';
import { NotificationModule } from '../notification/notification.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([CoffeeChat, AcceptedCoffeeChat]),
    UserModule,
    ChatModule,
    NotificationModule,
  ],
  controllers: [CoffeeChatController],
  providers: [CoffeeChatService],
  exports: [CoffeeChatService],
})
export class CoffeeChatModule {}

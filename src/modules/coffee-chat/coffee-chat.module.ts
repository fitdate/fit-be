import { Module } from '@nestjs/common';
import { CoffeeChatService } from './coffee-chat.service';
import { CoffeeChatController } from './coffee-chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoffeeChat } from './entities/coffee-chat.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([CoffeeChat]), UserModule],
  controllers: [CoffeeChatController],
  providers: [CoffeeChatService],
  exports: [CoffeeChatService],
})
export class CoffeeChatModule {}

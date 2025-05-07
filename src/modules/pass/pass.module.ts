import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pass } from './entities/pass.entity';
import { PassService } from './pass.service';
import { PassController } from './pass.controller';
import { User } from '../user/entities/user.entity';
import { CoffeeChatModule } from '../coffee-chat/coffee-chat.module';
@Module({
  imports: [TypeOrmModule.forFeature([Pass, User]), CoffeeChatModule],
  controllers: [PassController],
  providers: [PassService],
  exports: [PassService],
})
export class PassModule {}

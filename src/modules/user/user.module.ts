import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStatisticsService } from './services/user-statistics.service';
import { ChatRoomModule } from '../chat-room/chat-room.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => ChatRoomModule)],
  controllers: [UserController],
  providers: [UserService, UserStatisticsService],
  exports: [UserService, UserStatisticsService],
})
export class UserModule {}

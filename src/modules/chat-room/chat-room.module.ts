import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatRoomUser } from './entities/chat-room-user.entity';
import { ChatRoomService } from './chat-room.service';
import { ChatRoomController } from './chat-room.controller';
import { ChatRoomGateway } from './chat-room.gateway';
import { MessageModule } from '../message/message.module';
import { UserModule } from '../user/user.module';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, ChatRoomUser, User]),
    forwardRef(() => MessageModule),
    forwardRef(() => UserModule),
  ],
  controllers: [ChatRoomController],
  providers: [ChatRoomService, ChatRoomGateway],
  exports: [ChatRoomService],
})
export class ChatRoomModule {}

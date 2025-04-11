import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatRoomService } from './chat-room.service';
import { ChatRoomController } from './chat-room.controller';
import { ChatRoomGateway } from './chat-room.gateway';
import { MessageModule } from '../message/message.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatRoom]), MessageModule, UserModule],
  controllers: [ChatRoomController],
  providers: [ChatRoomService, ChatRoomGateway],
  exports: [ChatRoomService],
})
export class ChatRoomModule {}

import { Module } from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { ChatRoomController } from './chat-room.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatRoomUser } from './entities/chat-room-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatRoom, ChatRoomUser])],
  controllers: [ChatRoomController],
  providers: [ChatRoomService],
  exports: [ChatRoomService],
})
export class ChatRoomModule {}

import { Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../user/entities/user.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('chat_room_users')
export class ChatRoomUser extends BaseTable {
  @ApiProperty()
  @PrimaryColumn('uuid')
  chatRoomId: string;

  @ApiProperty()
  @PrimaryColumn('uuid')
  userId: string;

  @ApiProperty({ type: () => ChatRoom })
  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.chatRoomUsers)
  chatRoom: ChatRoom;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.chatRoomUsers)
  user: User;
}

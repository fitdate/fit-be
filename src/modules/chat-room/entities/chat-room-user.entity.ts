import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ChatRoom } from './chat-room.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('chat_room_users')
export class ChatRoomUser extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  chatRoomId: string;

  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  userId: string;

  @ApiProperty({ type: () => ChatRoom })
  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chat_room_id' })
  chatRoom: ChatRoom;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.chatRooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('chat_room_users')
export class ChatRoomUser {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.users)
  @JoinColumn({ name: 'chat_room_id' })
  chatRoom: ChatRoom;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Promise<User> | User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

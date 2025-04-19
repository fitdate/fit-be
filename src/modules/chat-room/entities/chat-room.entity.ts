import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ChatRoomUser } from './chat-room-user.entity';
import { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('chat_rooms')
export class ChatRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => ChatRoomUser, (chatRoomUser) => chatRoomUser.chatRoom)
  chatRoomUsers: ChatRoomUser[];

  @ApiProperty({ type: () => [User] })
  @ManyToMany(() => User)
  @JoinTable({
    name: 'chat_room_users',
    joinColumn: {
      name: 'chat_room_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
  })
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

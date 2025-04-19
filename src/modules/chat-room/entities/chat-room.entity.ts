import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Message } from '../../message/entities/message.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { ChatRoomUser } from './chat-room-user.entity';

@Entity('chat_rooms')
export class ChatRoom extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  title: string;

  @ApiProperty()
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ type: () => [Message] })
  @OneToMany(() => Message, (message) => message.chatRoom)
  messages: Message[];

  @ApiProperty({ type: () => [ChatRoomUser] })
  @OneToMany(() => ChatRoomUser, (chatRoomUser) => chatRoomUser.chatRoom)
  chatRoomUsers: ChatRoomUser[];

  @ApiProperty({ type: () => [User] })
  @ManyToMany(() => User, (user) => user.chatRooms)
  @JoinTable({
    name: 'chat_room_users',
    joinColumn: {
      name: 'chatRoomId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
  })
  users: User[];
}

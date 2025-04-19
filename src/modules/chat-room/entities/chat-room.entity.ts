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
import { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('chat_rooms')
export class ChatRoom extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  chatRoomId: string;

  @ApiProperty()
  @Column()
  title: string;

  @ApiProperty()
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ type: () => [Message] })
  @OneToMany(() => Message, (message) => message.chatRoom)
  messages: Message[];

  @ApiProperty({ type: () => [User] })
  @ManyToMany(() => User, (user) => user.chatRooms)
  @JoinTable({
    name: 'chat_room_users',
    joinColumn: {
      name: 'chat_room_id',
      referencedColumnName: 'chatRoomId',
    },
    inverseJoinColumn: {
      name: 'user_id',
      referencedColumnName: 'userId',
    },
  })
  users: User[];
}

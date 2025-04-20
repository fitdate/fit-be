import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Message } from '../../message/entities/message.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { ManyToMany, JoinTable } from 'typeorm';

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
}

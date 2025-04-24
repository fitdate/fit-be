import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ChatRoom } from './chat-room.entity';

@Entity()
export class ChatMessage extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column({ default: false })
  isSystem: boolean;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;

  @ManyToOne(() => ChatRoom)
  @JoinColumn()
  chatRoom: ChatRoom;

  @Column({ nullable: true })
  chatRoomId: string;
}

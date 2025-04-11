import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatRoom } from '../../chat-room/entities/chat-room.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';

@Entity('messages')
export class Message extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column()
  senderId: string;

  @Column({ type: 'enum', enum: ['text', 'image', 'emoji'], default: 'text' })
  type: 'text' | 'image' | 'emoji';

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ default: false })
  isRead: boolean;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages)
  @JoinColumn({ name: 'chatRoomId' })
  chatRoom: ChatRoom;

  @Column()
  chatRoomId: string;
}

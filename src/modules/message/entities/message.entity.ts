import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatRoom } from '../../chat-room/entities/chat-room.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('messages')
export class Message extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  content: string;

  @ApiProperty()
  @Column()
  senderId: string;

  @ApiProperty()
  @Column()
  senderName: string;

  @Column({ type: 'enum', enum: ['text', 'image', 'emoji'], default: 'text' })
  type: 'text' | 'image' | 'emoji';

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ default: false })
  isRead: boolean;

  @ApiProperty({ type: () => ChatRoom })
  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages)
  @JoinColumn()
  chatRoom: ChatRoom;

  @Column()
  chatRoomId: string;
}

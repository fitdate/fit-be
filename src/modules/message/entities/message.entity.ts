import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';
import { ChatRoom } from 'src/modules/chat-room/entities/chat-room.entity';

@Entity('messages')
export class Message extends BaseTable {
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

  @ApiProperty()
  @Column({ default: 'text' })
  type: string;

  @ApiProperty()
  @Column({ nullable: true })
  fileUrl: string;

  @ApiProperty()
  @Column({ default: false })
  isRead: boolean;

  @ApiProperty({ type: () => ChatRoom })
  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages)
  @JoinColumn({ name: 'chat_room_id' })
  chatRoom: ChatRoom;
}

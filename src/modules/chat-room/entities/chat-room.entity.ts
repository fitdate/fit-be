import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Message } from '../../message/entities/message.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';

@Entity('chat_rooms')
export class ChatRoom extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('simple-array')
  participants: string[]; // 사용자 ID 배열

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Message, (message) => message.chatRoom)
  messages: Message[];
}

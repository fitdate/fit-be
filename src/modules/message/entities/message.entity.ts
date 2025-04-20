import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';

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
}

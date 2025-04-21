import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';

@Entity()
export class ChatMessage extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column({ default: false })
  isSystem: boolean;

  @ManyToOne(() => User)
  user: User;

  @Column({ nullable: true })
  chatRoomId: string;
}

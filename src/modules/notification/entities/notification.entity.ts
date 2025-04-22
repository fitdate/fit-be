import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { NotificationType } from '../dto/create-notification.dto';

@Entity()
export class Notification extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @ManyToOne(() => User)
  @JoinColumn()
  receiver: User;

  @Column()
  receiverId: number;

  @Column({ type: 'json', nullable: true })
  data: Record<string, any>;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { NotificationType } from '../../../common/enum/notification.enum';

@Entity()
export class Notification extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
  receiver?: User;

  @Column({ type: 'uuid' })
  receiverId: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, any>;
}

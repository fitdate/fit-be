import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';

@Entity()
export class Like extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.likes)
  @JoinColumn()
  user: User;

  @ManyToOne(() => User, (user) => user.likedBy)
  @JoinColumn()
  likedUser: User;

  @Column({ default: false })
  isNotified: boolean;
}

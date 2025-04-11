import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Column,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Like {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.likes)
  @JoinColumn()
  user: User;

  @ManyToOne(() => User, (user) => user.likedBy)
  @JoinColumn()
  likedUser: User;

  @Column({ default: false })
  isNotified: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { CoffeeChatStatus } from '../enum/coffee-chat-statue.enum';
@Entity()
export class CoffeeChat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.coffeeChats)
  sender: User;

  @ManyToOne(() => User, (user) => user.coffeeChats)
  receiver: User;

  @Column({
    type: 'enum',
    enum: CoffeeChatStatus,
    default: CoffeeChatStatus.PENDING,
  })
  status: CoffeeChatStatus;

  @CreateDateColumn()
  createdAt: Date;
}

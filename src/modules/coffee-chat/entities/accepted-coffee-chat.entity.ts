import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class AcceptedCoffeeChat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.sentAcceptedCoffeeChats)
  sender: User;

  @ManyToOne(() => User, (user) => user.receivedAcceptedCoffeeChats)
  receiver: User;

  @CreateDateColumn()
  acceptedAt: Date;
}

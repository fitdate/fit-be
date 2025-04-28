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

  @ManyToOne(() => User, (user) => user.sentAcceptedCoffeeChats, { onDelete: 'CASCADE' })
  sender: User;

  @ManyToOne(() => User, (user) => user.receivedAcceptedCoffeeChats, { onDelete: 'CASCADE' })
  receiver: User;

  @CreateDateColumn()
  acceptedAt: Date;
}

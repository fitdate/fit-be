import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { CoffeeChatStatus } from '../enum/coffee-chat-statue.enum';
import { BaseTable } from 'src/common/entity/base-table.entity';
@Entity()
export class CoffeeChat extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.coffeeChats, { onDelete: 'CASCADE' })
  sender: User;

  @ManyToOne(() => User, (user) => user.coffeeChatsReceived, {
    onDelete: 'CASCADE',
  })
  receiver: User;

  @Column({
    type: 'enum',
    enum: CoffeeChatStatus,
    default: CoffeeChatStatus.PENDING,
  })
  status: CoffeeChatStatus;
}

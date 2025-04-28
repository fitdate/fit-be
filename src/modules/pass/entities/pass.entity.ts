import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';

@Entity('pass')
export class Pass extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  passedUserId: string;

  @Column({ type: 'enum', enum: ['MATCH', 'COFFEE_CHAT', 'BOTH'] })
  passType: 'MATCH' | 'COFFEE_CHAT' | 'BOTH';

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'passedUserId' })
  passedUser: User;
}

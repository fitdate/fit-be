import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { InterestCategory } from '../../interest-category/entities/interest-category.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';

@Entity()
export class UserInterestCategory extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;

  @ManyToOne(() => InterestCategory)
  @JoinColumn({ name: 'interest_category_id' })
  interestCategory: InterestCategory;

  @Column()
  interestLevel: string;
}

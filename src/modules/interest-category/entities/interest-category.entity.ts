import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { UserInterestCategory } from '../../user-interest-category/entities/user-interest-category.entity';

@Entity()
export class InterestCategory extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @OneToMany(
    () => UserInterestCategory,
    (userInterest) => userInterest.interestCategory,
  )
  userInterests: UserInterestCategory[];
}

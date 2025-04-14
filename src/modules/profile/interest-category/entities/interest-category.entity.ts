import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserInterestCategory } from './user-interest-category.entity';

@Entity()
export class InterestCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(
    () => UserInterestCategory,
    (userInterestCategory) => userInterestCategory.interestCategory,
  )
  userInterestCategories: UserInterestCategory[];
}

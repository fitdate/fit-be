import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InterestCategory } from './interest-category.entity';
import { Profile } from '../../entities/profile.entity';

@Entity('user_interest_category')
export class UserInterestCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InterestCategory)
  interestCategory: InterestCategory;

  @ManyToOne(() => Profile, (profile) => profile.interestCategory)
  profile: Profile;
}

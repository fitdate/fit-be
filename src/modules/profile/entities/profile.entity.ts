import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InterestLocation } from '../interest-location/entities/interest-location.entity';
import { ProfileImage } from '../profile-image/entities/profile-image.entity';
import { User } from '../../user/entities/user.entity';
import { Mbti } from '../mbti/entities/mbti.entity';
import { UserFeedback } from '../feedback/entities/user-feedback.entity';
import { UserInterestCategory } from '../interest-category/entities/user-interest-category.entity';
import { UserIntroduction } from '../introduction/entities/user-introduction.entity';

@Entity()
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  intro: string;

  @OneToMany(
    () => UserIntroduction,
    (userIntroduction) => userIntroduction.profile,
  )
  userIntroductions: UserIntroduction[];

  @OneToMany(() => UserFeedback, (userFeedback) => userFeedback.profile)
  userFeedbacks: UserFeedback[];

  @OneToMany(() => ProfileImage, (profileImage) => profileImage.profile)
  profileImage: ProfileImage[];

  @OneToOne(() => Mbti, (mbti) => mbti.profile)
  @JoinColumn()
  mbti: Mbti;

  @OneToMany(
    () => UserInterestCategory,
    (userInterestCategory) => userInterestCategory.profile,
  )
  interestCategory: UserInterestCategory[];

  @OneToMany(
    () => InterestLocation,
    (interestLocation) => interestLocation.profile,
  )
  interestLocation: InterestLocation[];

  @Column({ nullable: true })
  job: string;

  @OneToOne(() => User, (user) => user.profile)
  user: User;
}

import {
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProfileImage } from '../profile-image/entities/profile-image.entity';
import { User } from '../../user/entities/user.entity';
import { Mbti } from '../mbti/entities/mbti.entity';
import { UserFeedback } from '../feedback/entities/user-feedback.entity';
import { UserInterestCategory } from '../interest-category/entities/user-interest-category.entity';
import { UserIntroduction } from '../introduction/entities/user-introduction.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';

@Entity()
export class Profile extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(
    () => UserIntroduction,
    (userIntroduction) => userIntroduction.profile,
    {
      onDelete: 'CASCADE',
    },
  )
  userIntroductions: UserIntroduction[];

  @OneToMany(() => UserFeedback, (userFeedback) => userFeedback.profile, {
    onDelete: 'CASCADE',
  })
  userFeedbacks: UserFeedback[];

  @OneToMany(() => ProfileImage, (profileImage) => profileImage.profile, {
    onDelete: 'CASCADE',
  })
  profileImage: ProfileImage[];

  @OneToOne(() => Mbti, (mbti) => mbti.profile, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  mbti: Mbti;

  @OneToMany(
    () => UserInterestCategory,
    (userInterestCategory) => userInterestCategory.profile,
    {
      onDelete: 'CASCADE',
    },
  )
  interestCategory: UserInterestCategory[];

  @OneToOne(() => User, (user) => user.profile)
  user: User;
}

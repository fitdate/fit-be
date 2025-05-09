import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Profile } from '../../entities/profile.entity';
import { Feedback } from './feedback.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';
@Entity()
export class UserFeedback extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Feedback, (feedback) => feedback.userFeedbacks)
  feedback: Feedback;

  @ManyToOne(() => Profile, (profile) => profile.userFeedbacks)
  profile: Profile;
}

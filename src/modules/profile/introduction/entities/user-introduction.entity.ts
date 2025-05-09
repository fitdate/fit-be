import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Profile } from '../../entities/profile.entity';
import { Introduction } from './introduction.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';

@Entity()
export class UserIntroduction extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Profile, (profile) => profile.userIntroductions)
  @JoinColumn()
  profile: Profile;

  @ManyToOne(
    () => Introduction,
    (introduction) => introduction.userIntroductions,
  )
  @JoinColumn()
  introduction: Introduction;
}

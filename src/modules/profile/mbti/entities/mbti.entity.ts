import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Profile } from '../../entities/profile.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';

@Entity('mbti')
export class Mbti extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mbti: string;

  @OneToOne(() => Profile, (profile) => profile.mbti)
  profile: Profile;
}

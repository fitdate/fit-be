import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Profile } from '../../entities/profile.entity';

@Entity('mbti')
export class Mbti {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mbti: string;

  @OneToOne(() => Profile, (profile) => profile.mbti)
  profile: Profile;
}

import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Profile } from '../../entities/profile.entity';

@Entity()
export class ProfileImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Profile, (profile) => profile.profileImage)
  profile: Profile;

  @Column()
  imageUrl: string;

  @Column({ default: false })
  isMain: boolean;
}

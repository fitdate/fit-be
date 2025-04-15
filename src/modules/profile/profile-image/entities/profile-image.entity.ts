import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Profile } from '../../entities/profile.entity';

@Entity()
export class ProfileImage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Profile, (profile) => profile.profileImage)
  profile: Profile;

  @Column()
  imageUrl: string;
}

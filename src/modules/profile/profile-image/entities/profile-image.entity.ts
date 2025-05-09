import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Profile } from '../../entities/profile.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';

@Entity()
export class ProfileImage extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Profile, (profile) => profile.profileImage)
  profile: Profile;

  @Column()
  imageUrl: string;

  @Column()
  key: string;

  @Column({ default: false })
  isMain: boolean;
}

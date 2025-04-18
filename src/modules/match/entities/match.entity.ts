import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';

@Entity()
export class Match extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  matchId: string;

  @ManyToOne(() => Profile, { eager: true })
  user1: Profile;

  @ManyToOne(() => Profile, { eager: true })
  user2: Profile;
}

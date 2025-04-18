import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';

@Entity()
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  matchId: string;

  @ManyToOne(() => Profile, { eager: true })
  user1: Profile;

  @ManyToOne(() => Profile, { eager: true })
  user2: Profile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

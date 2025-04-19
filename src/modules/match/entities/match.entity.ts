import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  JoinColumn,
} from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Match extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ unique: true })
  matchCode: string;

  @ApiProperty({ type: () => Profile })
  @ManyToOne(() => Profile, { eager: true })
  @JoinColumn({ name: 'user1_id' })
  user1: Profile;

  @ApiProperty({ type: () => Profile })
  @ManyToOne(() => Profile, { eager: true })
  @JoinColumn({ name: 'user2_id' })
  user2: Profile;
}

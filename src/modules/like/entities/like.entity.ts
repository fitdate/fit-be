import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Like extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  likeId: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.likes)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.likedBy)
  @JoinColumn({ name: 'liked_user_id' })
  likedUser: User;

  @ApiProperty()
  @Column({ default: false })
  isNotified: boolean;
}

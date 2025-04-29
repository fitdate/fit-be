import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';
import { PassType } from './pass-type.enum';

@Entity('pass')
export class Pass extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  userId: string;

  @ApiProperty()
  @Column()
  passedUserId: string;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: PassType,
  })
  passType: PassType;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.passes)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.passedBy)
  @JoinColumn({ name: 'passedUserId' })
  passedUser: User;
}

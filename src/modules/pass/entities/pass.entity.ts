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
  @Column({ type: 'enum', enum: ['MATCH', 'COFFEE_CHAT', 'BOTH'] })
  passType: 'MATCH' | 'COFFEE_CHAT' | 'BOTH';

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.passes)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.passedBy)
  @JoinColumn({ name: 'passedUserId' })
  passedUser: User;
}

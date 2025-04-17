import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Pass extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.passes)
  @JoinColumn()
  user: User;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.passedBy)
  @JoinColumn()
  passedUser: User;
}

import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';

@Entity()
export class Pass extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.passes)
  @JoinColumn()
  user: User;

  @ManyToOne(() => User, (user) => user.passedBy)
  @JoinColumn()
  passedUser: User;
}

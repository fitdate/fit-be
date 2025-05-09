import { Max, Min } from 'class-validator';
import { User } from 'src/modules/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { BaseTable } from 'src/common/entity/base-table.entity';

@Entity()
export class UserFilter extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.userFilter)
  user: User;

  @Column({ default: '여자' })
  gender: '남자' | '여자';

  @Column({ default: 20 })
  @Min(20)
  minAge: number;

  @Column({ default: 60 })
  @Max(60)
  maxAge: number;

  @Column({ default: 0 })
  @Min(0)
  minLikeCount: number;

  @Column({ nullable: true })
  region: string;
}

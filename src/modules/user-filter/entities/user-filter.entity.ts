import { Max, Min } from 'class-validator';
import { User } from 'src/modules/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';

@Entity()
export class UserFilter {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.userFilter)
  user: User;

  // @Column({ default: 10 })
  // @Min(0)
  // @Max(10)
  // maxDistance: number;

  @Column({ default: 20 })
  @Min(20)
  minAge: number;

  @Column({ default: 60 })
  @Max(60)
  maxAge: number;

  @Column({ default: 0 })
  @Min(0)
  minLikeCount: number;
}

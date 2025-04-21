import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../../../common/enum/user-role.enum';
import { Profile } from '../../profile/entities/profile.entity';
import { Like } from '../../like/entities/like.entity';
import { Pass } from '../../pass/entities/pass.entity';
import { AuthProvider } from '../../auth/types/oatuth.types';
import { Payment } from '../../payment/entities/payment.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('users')
export class User extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ unique: true })
  email: string;

  @ApiProperty()
  @Column()
  password: string;

  @ApiProperty()
  @Column({ unique: true })
  nickname: string;

  @ApiProperty()
  @Column()
  name: string;

  @Column({ nullable: true })
  birthday: string;

  @Column({ nullable: true })
  gender: 'male' | 'female';

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @OneToOne(() => Profile, (profile) => profile.user)
  @JoinColumn()
  profile: Profile;

  @Column({ nullable: true })
  latitude?: number;

  @Column({ nullable: true })
  longitude?: number;

  @OneToMany(() => Like, (like) => like.likedUser)
  likes: Like[];

  @OneToMany(() => Like, (like) => like.user)
  likedBy: Like[];

  @Column({ default: 30 })
  likeCount: number;

  @OneToMany(() => Pass, (pass) => pass.passedUser)
  passedBy: Pass[];

  @OneToMany(() => Pass, (pass) => pass.user)
  passes: Pass[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @Column({ type: 'varchar', default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  isProfileComplete: boolean;

  @Column({ type: 'varchar' })
  authProvider: AuthProvider;
}

import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { UserRole } from 'src/common/enum/user-role.enum';
import { Like } from '../../like/entities/like.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ unique: true })
  nickname: string;

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

  // @OneToOne(() => Profile, (profile) => profile.user)
  // @JoinColumn()
  // profile: Profile;

  @Column({ nullable: true })
  latitude?: number;

  @Column({ nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  likeCount?: number;

  @Column({ nullable: true })
  passCount?: number;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @OneToMany(() => Like, (like) => like.user)
  likes: Like[];

  @OneToMany(() => Like, (like) => like.likedUser)
  likedBy: Like[];
}

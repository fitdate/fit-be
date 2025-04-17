import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  ManyToMany,
} from 'typeorm';
import { UserRole } from 'src/common/enum/user-role.enum';
import { Profile } from 'src/modules/profile/entities/profile.entity';
import { Like } from 'src/modules/like/entities/like.entity';
import { Pass } from 'src/modules/pass/entities/pass.entity';
import { AuthProvider } from 'src/modules/auth/types/oatuth.types';
import { Payment } from 'src/modules/payment/entities/payment.entity';
import { ChatRoom } from 'src/modules/chat-room/entities/chat-room.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @OneToMany(() => Pass, (pass) => pass.passedUser)
  passedBy: Pass[];

  @OneToMany(() => Pass, (pass) => pass.user)
  passes: Pass[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.users)
  chatRooms: ChatRoom[];

  @Column({ type: 'varchar', default: UserRole.USER })
  role: UserRole;

  @Column({ nullable: true })
  likeCount: number;

  @Column({ default: false })
  isProfileComplete: boolean;

  @Column({ type: 'varchar' })
  authProvider: AuthProvider;
}

import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  ManyToMany,
} from 'typeorm';
import { UserRole } from '../../../common/enum/user-role.enum';
import { Profile } from '../../profile/entities/profile.entity';
import { Like } from '../../like/entities/like.entity';
import { Pass } from '../../pass/entities/pass.entity';
import { AuthProvider } from '../../auth/types/oatuth.types';
import { Payment } from '../../payment/entities/payment.entity';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { ChatMessage } from '../../chat/entities/chat-message.entity';
import { ChatRoom } from '../../chat/entities/chat-room.entity';
import { UserList } from '../../user-list/entities/user-list.entity';
@Entity('users')
export class User extends BaseTable {
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
  location: string;

  @Column({ nullable: true })
  gender: '남자' | '여자';

  @Column({ nullable: true })
  region?: string;

  @Column({ nullable: true })
  height: string;

  @Column({ nullable: true })
  job?: string;
  @Column({ nullable: true })
  phone?: string;

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

  @Column({ nullable: true })
  chatToken: string;

  @Column({ default: false })
  chatOnline: boolean;

  @OneToMany(() => ChatMessage, (message) => message.user)
  messages: ChatMessage[];

  @ManyToMany(() => ChatRoom, (room) => room.users)
  chatRooms: ChatRoom[];

  @OneToOne(() => UserList, (userList) => userList.user)
  @JoinColumn()
  userList: UserList;
}

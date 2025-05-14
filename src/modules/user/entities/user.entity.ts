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
import { UserFilter } from '../../user-filter/entities/user-filter.entity';
import { CoffeeChat } from 'src/modules/coffee-chat/entities/coffee-chat.entity';
import { DatingPreference } from 'src/modules/dating-preference/entities/dating-preference.entity';
import { AcceptedCoffeeChat } from 'src/modules/coffee-chat/entities/accepted-coffee-chat.entity';
@Entity('users')
export class User extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: true, type: 'varchar', default: null })
  password: string | null;

  @Column({ unique: true, nullable: true })
  nickname: string;

  @Column({ nullable: true })
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
  height: number;

  @Column({ nullable: true })
  job?: string;
  @Column({ nullable: true })
  phone?: string;

  @OneToOne(() => Profile, (profile) => profile.user, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  profile: Profile;

  @Column({ nullable: true })
  latitude?: number;

  @Column({ nullable: true })
  longitude?: number;

  @OneToMany(() => Like, (like) => like.likedUser, { onDelete: 'CASCADE' })
  likes: Like[];

  @OneToMany(() => Like, (like) => like.user, { onDelete: 'CASCADE' })
  likedBy: Like[];

  @Column({ default: 0, nullable: true })
  likeCount: number;

  @Column({ default: 100, nullable: true })
  coffee: number;

  @OneToMany(() => Pass, (pass) => pass.passedUser, { onDelete: 'CASCADE' })
  passedBy: Pass[];

  @OneToMany(() => Pass, (pass) => pass.user, { onDelete: 'CASCADE' })
  passes: Pass[];

  @OneToMany(() => Payment, (payment) => payment.user, { onDelete: 'CASCADE' })
  payments: Payment[];

  @Column({ type: 'varchar', default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  isProfileComplete: boolean;

  @Column({ type: 'varchar' })
  authProvider: AuthProvider;

  @Column({ type: 'varchar', nullable: true })
  socketId: string;

  @OneToMany(() => ChatMessage, (message) => message.user)
  messages: ChatMessage[];

  @ManyToMany(() => ChatRoom, (room) => room.users)
  chatRooms: ChatRoom[];

  @OneToOne(() => UserFilter, (userFilter) => userFilter.user, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  userFilter: UserFilter;

  @OneToMany(() => CoffeeChat, (coffeeChat) => coffeeChat.sender, {
    onDelete: 'CASCADE',
  })
  coffeeChats: CoffeeChat[];

  @OneToMany(() => CoffeeChat, (coffeeChat) => coffeeChat.receiver, {
    onDelete: 'CASCADE',
  })
  coffeeChatsReceived: CoffeeChat[];

  @OneToOne(
    () => DatingPreference,
    (datingPreference) => datingPreference.user,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn()
  datingPreference: DatingPreference;

  @OneToMany(
    () => AcceptedCoffeeChat,
    (acceptedCoffeeChat) => acceptedCoffeeChat.sender,
    { onDelete: 'CASCADE' },
  )
  sentAcceptedCoffeeChats: AcceptedCoffeeChat[];

  @OneToMany(
    () => AcceptedCoffeeChat,
    (acceptedCoffeeChat) => acceptedCoffeeChat.receiver,
    { onDelete: 'CASCADE' },
  )
  receivedAcceptedCoffeeChats: AcceptedCoffeeChat[];
}

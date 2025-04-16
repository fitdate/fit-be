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
import { Payment } from 'src/modules/payment/entities/payment.entity';
import { ChatRoom } from 'src/modules/chat-room/entities/chat-room.entity';
import { ChatRoomUser } from 'src/modules/chat-room/entities/chat-room-user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @ApiProperty()
  @Column({ unique: true })
  nickname: string;

  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty()
  @Column({ nullable: true })
  birthday: string;

  @ApiProperty()
  @Column({ nullable: true })
  gender: 'male' | 'female';

  @ApiProperty()
  @Column({ nullable: true })
  address?: string;

  @ApiProperty()
  @Column({ nullable: true })
  phoneNumber?: string;

  @ApiProperty({ type: () => Profile })
  @OneToOne(() => Profile, (profile) => profile.user)
  @JoinColumn()
  profile: Profile;

  @ApiProperty()
  @Column({ nullable: true })
  latitude?: number;

  @ApiProperty()
  @Column({ nullable: true })
  longitude?: number;

  @ApiProperty({ type: () => [Like] })
  @OneToMany(() => Like, (like) => like.likedUser)
  likes: Like[];

  @ApiProperty({ type: () => [Like] })
  @OneToMany(() => Like, (like) => like.user)
  likedBy: Like[];

  @ApiProperty({ type: () => [Pass] })
  @OneToMany(() => Pass, (pass) => pass.passedUser)
  passedBy: Pass[];

  @ApiProperty({ type: () => [Pass] })
  @OneToMany(() => Pass, (pass) => pass.user)
  passes: Pass[];

  @ApiProperty({ type: () => [Payment] })
  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @ApiProperty({ type: () => [ChatRoom] })
  @ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.users)
  chatRooms: ChatRoom[];

  @ApiProperty({ type: () => [ChatRoomUser] })
  @OneToMany(() => ChatRoomUser, (chatRoomUser) => chatRoomUser.user)
  chatRoomUsers: ChatRoomUser[];

  @ApiProperty()
  @Column({ type: 'varchar', default: UserRole.USER })
  role: UserRole;

  @ApiProperty()
  @Column({ nullable: true })
  likeCount: number;
}

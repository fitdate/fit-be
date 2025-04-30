import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_tokens')
export class UserToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  userId: string;

  @Column({ nullable: true })
  tokenId: string;

  @Column({ nullable: true })
  accessToken: string;

  @Column({
    type: 'enum',
    enum: ['access', 'refresh'],
    default: 'refresh',
  })
  tokenType: 'access' | 'refresh';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 
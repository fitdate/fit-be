import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserFeedback } from './user-feedback.entity';

@Entity()
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => UserFeedback, (userFeedback) => userFeedback.feedback)
  userFeedbacks: UserFeedback[];
}

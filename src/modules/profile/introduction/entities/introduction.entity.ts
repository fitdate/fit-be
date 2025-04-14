import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserIntroduction } from './user-introduction.entity';

@Entity()
export class Introduction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(
    () => UserIntroduction,
    (userIntroduction) => userIntroduction.introduction,
  )
  userIntroductions: UserIntroduction[];
}

import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Profile } from '../../entities/profile.entity';

@Entity()
export class InterestLocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sido: string;

  @Column()
  sigungu: string;

  @Column({ nullable: true })
  eupmyeondong: string; // 예: 역삼동 (일부 지역은 null 가능)

  @ManyToOne(() => Profile, (profile) => profile.interestLocation)
  profile: Profile;
}

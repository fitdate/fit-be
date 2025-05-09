import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';

@Entity()
export class DatingPreference extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.datingPreference)
  user: User;

  @Column()
  ageMin: number;

  @Column()
  ageMax: number;

  @Column()
  heightMin: number;

  @Column()
  heightMax: number;

  @Column()
  region: string;
}

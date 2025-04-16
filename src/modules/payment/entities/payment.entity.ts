import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { BaseTable } from 'src/common/entity/base-table.entity';

export type PaymentStatus =
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'DONE'
  | 'CANCELED';
export type PaymentMethod = 'credit_card' | 'kakao_pay' | 'naver_pay';

@Entity()
export class Payment extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @ManyToOne(() => User, (user) => user.payments)
  user: User;

  @ApiProperty()
  @Column()
  orderName: string;

  @ApiProperty()
  @Column({ unique: true })
  orderId: string;

  @ApiProperty()
  @Column()
  amount: number;

  @ApiProperty()
  @Column({ nullable: true })
  paymentKey: string;

  @ApiProperty()
  @Column()
  status: PaymentStatus;

  @ApiProperty()
  @Column({ nullable: true })
  customerEmail: string;

  @ApiProperty()
  @Column({ nullable: true })
  customerName: string;

  @ApiProperty()
  @Column({ nullable: true })
  customerMobilePhone: string;

  @ApiProperty()
  @Column()
  paymentMethod: PaymentMethod;
}

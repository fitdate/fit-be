import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { PaymentStatus } from '../types/payment.types';
import { PaymentMethod } from '../types/payment.types';

@Entity()
export class Payment extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'userId' })
  user!: User;

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

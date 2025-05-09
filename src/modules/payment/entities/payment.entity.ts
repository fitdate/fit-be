import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { BaseTable } from '../../../common/entity/base-table.entity';
import { PaymentStatus, PaymentMethod } from '../types/payment.types';

@Entity()
export class Payment extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
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
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @ApiProperty()
  @Column()
  customerEmail: string;

  @ApiProperty()
  @Column()
  customerName: string;

  @ApiProperty()
  @Column()
  customerMobilePhone: string;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CREDIT_CARD,
  })
  paymentMethod: PaymentMethod;
}

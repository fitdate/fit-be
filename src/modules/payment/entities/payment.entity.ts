import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseTable } from 'src/common/entity/base-table.entity';

@Entity()
export class Payment extends BaseTable {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  orderId: string;

  @ApiProperty()
  @Column()
  orderName: string;

  @ApiProperty()
  @Column()
  amount: number;

  @ApiProperty()
  @Column({ nullable: true })
  paymentKey: string;

  @ApiProperty()
  @Column({ default: 'READY' })
  status: 'READY' | 'IN_PROGRESS' | 'DONE' | 'CANCELED' | 'ABORTED';

  @ApiProperty()
  @Column({ nullable: true })
  customerEmail: string;

  @ApiProperty()
  @Column({ nullable: true })
  customerName: string;

  @ApiProperty()
  @Column({ nullable: true })
  customerMobilePhone: string;
}

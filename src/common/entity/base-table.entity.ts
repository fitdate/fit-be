import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class BaseTable {
  @CreateDateColumn()
  @Exclude()
  @IsOptional()
  createdAt?: Date;

  @UpdateDateColumn()
  @Exclude()
  @IsOptional()
  updatedAt?: Date;

  @DeleteDateColumn()
  @Exclude()
  @IsOptional()
  deletedAt?: Date;
}

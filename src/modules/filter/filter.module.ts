import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFilter } from '../user-filter/entities/user-filter.entity';
import { FilterService } from './filter.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserFilter])],
  providers: [FilterService],
  exports: [FilterService],
})
export class FilterModule {}

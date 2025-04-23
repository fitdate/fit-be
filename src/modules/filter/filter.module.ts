import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFilter } from '../user-filter/entities/user-filter.entity';
import { FilterService } from './filter.service';
import { UserFilterModule } from '../user-filter/user-filter.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserFilter]), UserFilterModule],
  providers: [FilterService],
  exports: [FilterService],
})
export class FilterModule {}

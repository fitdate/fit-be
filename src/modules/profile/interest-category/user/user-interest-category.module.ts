import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserInterestCategory } from '../entities/user-interest-category.entity';
import { UserInterestCategoryService } from './user-interest-category.service';
import { InterestCategoryModule } from '../common/interest-category.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserInterestCategory]),
    InterestCategoryModule,
  ],
  controllers: [],
  providers: [UserInterestCategoryService],
  exports: [UserInterestCategoryService],
})
export class UserInterestCategoryModule {}

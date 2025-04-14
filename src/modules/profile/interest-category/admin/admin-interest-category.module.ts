import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { InterestCategory } from '../entities/interest-category.entity';
import { AdminInterestCategoryController } from './admin-interest-category.controller';
import { AdminInterestCategoryService } from './admin-interest-category.service';

@Module({
  imports: [TypeOrmModule.forFeature([InterestCategory])],
  controllers: [AdminInterestCategoryController],
  providers: [AdminInterestCategoryService],
})
export class AdminInterestCategoryModule {}

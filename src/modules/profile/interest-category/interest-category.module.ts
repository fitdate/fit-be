import { Module } from '@nestjs/common';
import { InterestCategoryService } from './interest-category.service';
import { InterestCategoryController } from './interest-category.controller';

@Module({
  controllers: [InterestCategoryController],
  providers: [InterestCategoryService],
})
export class InterestCategoryModule {}

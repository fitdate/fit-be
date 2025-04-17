import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterestCategory } from './entities/interest-category.entity';
import { InterestCategoryService } from './interest-category.service';
import { InterestCategoryController } from './interest-category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InterestCategory])],
  controllers: [InterestCategoryController],
  providers: [InterestCategoryService],
  exports: [InterestCategoryService],
})
export class InterestCategoryModule {}

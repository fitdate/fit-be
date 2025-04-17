import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { InterestCategoryService } from './interest-category.service';
import { InterestCategory } from './entities/interest-category.entity';

@Controller('interest-categories')
export class InterestCategoryController {
  constructor(
    private readonly interestCategoryService: InterestCategoryService,
  ) {}

  @Get()
  findAll(): Promise<InterestCategory[]> {
    return this.interestCategoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<InterestCategory> {
    return this.interestCategoryService.findOne(+id);
  }

  @Post()
  create(
    @Body() interestCategory: Partial<InterestCategory>,
  ): Promise<InterestCategory> {
    return this.interestCategoryService.create(interestCategory);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() interestCategory: Partial<InterestCategory>,
  ): Promise<InterestCategory> {
    return this.interestCategoryService.update(+id, interestCategory);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.interestCategoryService.remove(+id);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InterestCategoryService } from './interest-category.service';
import { CreateInterestCategoryDto } from './dto/create-interest-category.dto';
import { UpdateInterestCategoryDto } from './dto/update-interest-category.dto';

@Controller('interest-category')
export class InterestCategoryController {
  constructor(private readonly interestCategoryService: InterestCategoryService) {}

  @Post()
  create(@Body() createInterestCategoryDto: CreateInterestCategoryDto) {
    return this.interestCategoryService.create(createInterestCategoryDto);
  }

  @Get()
  findAll() {
    return this.interestCategoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.interestCategoryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInterestCategoryDto: UpdateInterestCategoryDto) {
    return this.interestCategoryService.update(+id, updateInterestCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.interestCategoryService.remove(+id);
  }
}

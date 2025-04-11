import { Injectable } from '@nestjs/common';
import { CreateInterestCategoryDto } from './dto/create-interest-category.dto';
import { UpdateInterestCategoryDto } from './dto/update-interest-category.dto';

@Injectable()
export class InterestCategoryService {
  create(createInterestCategoryDto: CreateInterestCategoryDto) {
    return 'This action adds a new interestCategory';
  }

  findAll() {
    return `This action returns all interestCategory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} interestCategory`;
  }

  update(id: number, updateInterestCategoryDto: UpdateInterestCategoryDto) {
    return `This action updates a #${id} interestCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} interestCategory`;
  }
}

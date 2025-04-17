import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterestCategory } from './entities/interest-category.entity';

@Injectable()
export class InterestCategoryService {
  constructor(
    @InjectRepository(InterestCategory)
    private readonly interestCategoryRepository: Repository<InterestCategory>,
  ) {}

  async findAll(): Promise<InterestCategory[]> {
    return this.interestCategoryRepository.find();
  }

  async findOne(id: number): Promise<InterestCategory> {
    const category = await this.interestCategoryRepository.findOne({
      where: { id },
    });
    if (!category) {
      throw new Error('Interest category not found');
    }
    return category;
  }

  async create(
    interestCategory: Partial<InterestCategory>,
  ): Promise<InterestCategory> {
    const newInterestCategory =
      this.interestCategoryRepository.create(interestCategory);
    return this.interestCategoryRepository.save(newInterestCategory);
  }

  async update(
    id: number,
    interestCategory: Partial<InterestCategory>,
  ): Promise<InterestCategory> {
    await this.interestCategoryRepository.update(id, interestCategory);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.interestCategoryRepository.delete(id);
  }
}

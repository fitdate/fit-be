import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findOne(id: string): Promise<InterestCategory> {
    const interestCategory = await this.interestCategoryRepository.findOne({
      where: { id },
    });
    if (!interestCategory) {
      throw new NotFoundException('Interest category not found');
    }
    return interestCategory;
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
    return this.findOne(id.toString());
  }

  async remove(id: number): Promise<void> {
    await this.interestCategoryRepository.delete(id);
  }
}

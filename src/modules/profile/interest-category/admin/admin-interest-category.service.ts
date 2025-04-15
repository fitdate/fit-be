import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateInterestCategoryDto } from '../dto/create-interest-category.dto';
import { InterestCategory } from '../entities/interest-category.entity';
import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateInterestCategoryDto } from '../dto/update-interest-category.dto';
import { InterestCategoryResponseDto } from '../dto/interest-category-response.dto';

@Injectable()
export class AdminInterestCategoryService {
  constructor(
    @InjectRepository(InterestCategory)
    private interestCategoryRepository: Repository<InterestCategory>,
  ) {}

  async createInterestCategory(
    createInterestCategoryDto: CreateInterestCategoryDto,
  ): Promise<InterestCategoryResponseDto> {
    const interestCategory = await this.interestCategoryRepository.findOne({
      where: {
        name: createInterestCategoryDto.name,
      },
    });

    if (interestCategory) {
      throw new ConflictException('이미 존재하는 관심사 카테고리입니다.');
    }

    const newInterestCategory = await this.interestCategoryRepository.save(
      createInterestCategoryDto,
    );

    return {
      id: newInterestCategory.id,
      name: newInterestCategory.name,
    };
  }

  findAllInterestCategory(): Promise<InterestCategory[]> {
    return this.interestCategoryRepository.find();
  }

  async findOneInterestCategory(id: string): Promise<InterestCategory> {
    const interestCategory = await this.interestCategoryRepository.findOne({
      where: { id },
    });

    if (!interestCategory) {
      throw new NotFoundException('존재하지 않는 관심사 카테고리입니다.');
    }

    return interestCategory;
  }

  async updateInterestCategory(
    id: string,
    updateInterestCategoryDto: UpdateInterestCategoryDto,
  ): Promise<InterestCategoryResponseDto> {
    await this.findOneInterestCategory(id);
    if (updateInterestCategoryDto.name) {
      const existing = await this.interestCategoryRepository.findOne({
        where: {
          name: updateInterestCategoryDto.name,
          id: Not(id),
        },
      });
      if (existing) {
        throw new ConflictException('이미 존재하는 관심사 카테고리입니다.');
      }
    }

    await this.interestCategoryRepository.update(id, updateInterestCategoryDto);
    const updatedInterestCategory = await this.findOneInterestCategory(id);
    return {
      id: updatedInterestCategory.id,
      name: updatedInterestCategory.name,
    };
  }

  async deleteInterestCategory(
    id: string,
  ): Promise<InterestCategoryResponseDto> {
    const interestCategory = await this.findOneInterestCategory(id);
    await this.interestCategoryRepository.delete(id);
    return {
      id: interestCategory.id,
      name: interestCategory.name,
    };
  }
}

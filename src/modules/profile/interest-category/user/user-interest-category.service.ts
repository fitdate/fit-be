import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInterestCategory } from '../entities/user-interest-category.entity';
import { CreateUserInterestCategoryDto } from '../dto/create-user-interest-category.dto';

@Injectable()
export class UserInterestCategoryService {
  constructor(
    @InjectRepository(UserInterestCategory)
    private readonly userInterestCategoryRepository: Repository<UserInterestCategory>,
  ) {}

  async createUserInterestCategory(
    dto: CreateUserInterestCategoryDto,
  ): Promise<UserInterestCategory[]> {
    const userInterestCategories = dto.interestCategoryIds.map(
      (interestCategoryId) =>
        this.userInterestCategoryRepository.create({
          interestCategory: { id: interestCategoryId },
          profile: { id: dto.profileId },
        }),
    );

    return this.userInterestCategoryRepository.save(userInterestCategories);
  }

  async updateUserInterestCategory(
    dto: CreateUserInterestCategoryDto,
  ): Promise<UserInterestCategory[]> {
    const existingUserInterestCategories =
      await this.userInterestCategoryRepository.find({
        where: { profile: { id: dto.profileId } },
        relations: ['interestCategory'],
      });

    const existingInterestCategoryIds = existingUserInterestCategories.map(
      (userInterestCategory) => userInterestCategory.interestCategory.id,
    );

    const interestCategoriesToRemove = existingUserInterestCategories.filter(
      (userInterestCategory) =>
        !dto.interestCategoryIds.includes(
          userInterestCategory.interestCategory.id,
        ),
    );

    if (interestCategoriesToRemove.length > 0) {
      await this.userInterestCategoryRepository.remove(
        interestCategoriesToRemove,
      );
    }

    const interestCategoriesToAdd = dto.interestCategoryIds.filter(
      (id) => !existingInterestCategoryIds.includes(id),
    );

    if (interestCategoriesToAdd.length > 0) {
      const newInterestCategories = interestCategoriesToAdd.map(
        (interestCategoryId) =>
          this.userInterestCategoryRepository.create({
            interestCategory: { id: interestCategoryId },
            profile: { id: dto.profileId },
          }),
      );

      await this.userInterestCategoryRepository.save(newInterestCategories);
    }

    return this.userInterestCategoryRepository.find({
      where: { profile: { id: dto.profileId } },
      relations: ['interestCategory'],
      order: { id: 'ASC' },
    });
  }
}

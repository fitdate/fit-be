import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInterestCategory } from '../entities/user-interest-category.entity';
import { CreateUserInterestCategoryDto } from '../dto/create-user-interest-category.dto';
import { InterestCategoryService } from '../common/interest-category.service';

@Injectable()
export class UserInterestCategoryService {
  constructor(
    @InjectRepository(UserInterestCategory)
    private readonly userInterestCategoryRepository: Repository<UserInterestCategory>,
    private readonly interestCategoryService: InterestCategoryService,
  ) {}

  async createUserInterestCategory(
    dto: CreateUserInterestCategoryDto,
  ): Promise<UserInterestCategory[]> {
    const userInterestCategories: UserInterestCategory[] = [];

    for (const name of dto.interestCategoryNames) {
      // 관심사 이름으로 InterestCategory 찾기
      let interestCategory = (
        await this.interestCategoryService.searchInterestCategories(name)
      )[0];

      // 없으면 새로 생성
      if (!interestCategory) {
        interestCategory =
          await this.interestCategoryService.createInterestCategory({
            name,
          });
      }

      // UserInterestCategory 생성
      const userInterestCategory = this.userInterestCategoryRepository.create({
        interestCategory: { id: interestCategory.id },
        profile: { id: dto.profileId },
      });

      userInterestCategories.push(userInterestCategory);
    }

    // 저장
    return this.userInterestCategoryRepository.save(userInterestCategories);
  }

  async updateUserInterestCategory(
    dto: CreateUserInterestCategoryDto,
  ): Promise<UserInterestCategory[]> {
    // Find all interest categories by their names
    const interestCategories =
      await this.interestCategoryService.findAllInterestCategory();

    // Check if all requested categories exist
    const foundNames = interestCategories.map((cat) => cat.name);
    const missingNames = dto.interestCategoryNames.filter(
      (name) => !foundNames.includes(name),
    );

    if (missingNames.length > 0) {
      throw new NotFoundException(
        `The following interest categories do not exist: ${missingNames.join(', ')}`,
      );
    }

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
        !interestCategories.some(
          (cat) => cat.id === userInterestCategory.interestCategory.id,
        ),
    );

    if (interestCategoriesToRemove.length > 0) {
      await this.userInterestCategoryRepository.remove(
        interestCategoriesToRemove,
      );
    }

    const interestCategoriesToAdd = interestCategories.filter(
      (cat) => !existingInterestCategoryIds.includes(cat.id),
    );

    if (interestCategoriesToAdd.length > 0) {
      const newInterestCategories = interestCategoriesToAdd.map(
        (interestCategory) =>
          this.userInterestCategoryRepository.create({
            interestCategory: { id: interestCategory.id },
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

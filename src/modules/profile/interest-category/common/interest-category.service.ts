import { Injectable, Logger } from '@nestjs/common';
import { InterestCategory } from '../entities/interest-category.entity';
import { Repository, In, ILike } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateManyInterestCategoryDto } from '../dto/create-many-interest-category.dto';
interface CreateManyInterestCategoryResponse {
  created: InterestCategory[];
  skipped: string[];
}

interface InterestCategoryInput {
  name: string;
  description?: string;
}

@Injectable()
export class InterestCategoryService {
  private readonly logger = new Logger(InterestCategoryService.name);

  constructor(
    @InjectRepository(InterestCategory)
    private readonly interestCategoryRepository: Repository<InterestCategory>,
  ) {}

  async createManyInterestCategoryFromSeed(
    interestCategories: InterestCategoryInput[],
  ): Promise<CreateManyInterestCategoryResponse> {
    this.logger.debug(
      `Creating ${interestCategories.length} interest categories from seed`,
    );
    return this.createManyInterestCategory({
      interestCategories,
    });
  }

  async createManyInterestCategory(
    createManyInterestCategoryDto: CreateManyInterestCategoryDto,
  ): Promise<CreateManyInterestCategoryResponse> {
    const names = createManyInterestCategoryDto.interestCategories.map(
      (dto) => dto.name,
    );
    this.logger.debug(
      `Checking existing interest categories for names: ${names.join(', ')}`,
    );

    const existingInterestCategories =
      await this.interestCategoryRepository.find({
        where: { name: In(names) },
      });

    const existingNames = existingInterestCategories.map(
      (category) => category.name,
    );
    const newInterestCategories =
      createManyInterestCategoryDto.interestCategories.filter(
        (dto) => !existingNames.includes(dto.name),
      );

    const skippedNames = createManyInterestCategoryDto.interestCategories
      .filter((dto) => existingNames.includes(dto.name))
      .map((dto) => dto.name);

    if (skippedNames.length > 0) {
      this.logger.warn(
        `Skipping existing interest category names: ${skippedNames.join(', ')}`,
      );
    }

    if (newInterestCategories.length === 0) {
      this.logger.log('No new interest categories to create');
      return {
        created: [],
        skipped: skippedNames,
      };
    }

    this.logger.debug(
      `Creating ${newInterestCategories.length} new interest categories`,
    );
    const created = await this.interestCategoryRepository.save(
      newInterestCategories,
    );
    this.logger.log(
      `Successfully created ${created.length} interest categories`,
    );

    return {
      created,
      skipped: skippedNames,
    };
  }

  async findAllInterestCategory(): Promise<InterestCategory[]> {
    this.logger.debug('Fetching all interest categories');
    const interestCategories = await this.interestCategoryRepository.find();
    this.logger.log(`Found ${interestCategories.length} interest categories`);
    return interestCategories;
  }

  async searchInterestCategories(name: string): Promise<InterestCategory[]> {
    this.logger.debug(`Searching interest categories with name: ${name}`);
    const interestCategories = await this.interestCategoryRepository.find({
      where: { name: ILike(`%${name}%`) },
    });

    if (interestCategories.length === 0) {
      this.logger.debug(`No interest categories found for name: ${name}`);
      return [];
    }

    this.logger.log(
      `Found ${interestCategories.length} interest categories for name: ${name}`,
    );
    return interestCategories;
  }

  async findManyInterestCategories(ids: number[]): Promise<InterestCategory[]> {
    this.logger.debug(
      `Fetching interest categories with IDs: ${ids.join(', ')}`,
    );
    const interestCategories = await this.interestCategoryRepository.find({
      where: { id: In(ids) },
    });
    this.logger.log(`Found ${interestCategories.length} interest categories`);
    return interestCategories;
  }
}

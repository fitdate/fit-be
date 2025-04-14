import { Injectable, Logger } from '@nestjs/common';
import { Introduction } from '../entities/introduction.entity';
import { Repository, In, ILike } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateManyIntroductionDto } from '../dto/create-many-introduction.dto';

interface CreateManyIntroductionResponse {
  created: Introduction[];
  skipped: string[];
}

interface IntroductionInput {
  name: string;
}

@Injectable()
export class IntroductionService {
  private readonly logger = new Logger(IntroductionService.name);

  constructor(
    @InjectRepository(Introduction)
    private readonly introductionRepository: Repository<Introduction>,
  ) {}

  async createManyIntroductionFromSeed(
    introductions: IntroductionInput[],
  ): Promise<CreateManyIntroductionResponse> {
    this.logger.debug(
      `Creating ${introductions.length} introductions from seed`,
    );
    return this.createManyIntroduction({ introductions });
  }

  async createManyIntroduction(
    createManyIntroductionDto: CreateManyIntroductionDto,
  ): Promise<CreateManyIntroductionResponse> {
    const names = createManyIntroductionDto.introductions.map(
      (dto) => dto.name,
    );
    this.logger.debug(
      `Checking existing introductions for names: ${names.join(', ')}`,
    );

    const existingIntroductions = await this.introductionRepository.find({
      where: { name: In(names) },
    });

    const existingNames = existingIntroductions.map(
      (introduction) => introduction.name,
    );
    const newIntroductions = createManyIntroductionDto.introductions.filter(
      (dto) => !existingNames.includes(dto.name),
    );

    const skippedNames = createManyIntroductionDto.introductions
      .filter((dto) => existingNames.includes(dto.name))
      .map((dto) => dto.name);

    if (skippedNames.length > 0) {
      this.logger.warn(
        `Skipping existing introduction names: ${skippedNames.join(', ')}`,
      );
    }

    if (newIntroductions.length === 0) {
      this.logger.log('No new introductions to create');
      return {
        created: [],
        skipped: skippedNames,
      };
    }

    this.logger.debug(`Creating ${newIntroductions.length} new introductions`);
    const created = await this.introductionRepository.save(newIntroductions);
    this.logger.log(`Successfully created ${created.length} introductions`);

    return {
      created,
      skipped: skippedNames,
    };
  }

  async findAllIntroduction(): Promise<Introduction[]> {
    this.logger.debug('Fetching all introductions');
    const introductions = await this.introductionRepository.find();
    this.logger.log(`Found ${introductions.length} introductions`);
    return introductions;
  }

  async searchIntroductions(name: string): Promise<Introduction[]> {
    this.logger.debug(`Searching introductions with name: ${name}`);
    const introductions = await this.introductionRepository.find({
      where: { name: ILike(`%${name}%`) },
    });

    if (introductions.length === 0) {
      this.logger.debug(`No introductions found for name: ${name}`);
      return [];
    }

    this.logger.log(
      `Found ${introductions.length} introductions for name: ${name}`,
    );
    return introductions;
  }

  async findManyIntroductions(ids: number[]): Promise<Introduction[]> {
    this.logger.debug(`Fetching introductions with IDs: ${ids.join(', ')}`);
    const introductions = await this.introductionRepository.find({
      where: { id: In(ids) },
    });
    this.logger.log(`Found ${introductions.length} introductions`);
    return introductions;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonSeedService } from './json-seed/json-seed.service';
import { FeedbackService } from '../profile/feedback/common/feedback.service';
import { IntroductionService } from '../profile/introduction/common/introduction.service';
import { InterestCategoryService } from '../profile/interest-category/common/interest-category.service';
import { SEED_PATH, SeedKey } from './types/seed.types';

interface ServiceMap {
  feedback: FeedbackService;
  introduction: IntroductionService;
  interestCategory: InterestCategoryService;
}

@Injectable()
export class SeedManagerService {
  private readonly logger = new Logger(SeedManagerService.name);
  private readonly services: ServiceMap;

  constructor(
    private readonly configService: ConfigService,
    private readonly jsonSeedService: JsonSeedService,
    private readonly feedbackService: FeedbackService,
    private readonly introductionService: IntroductionService,
    private readonly interestCategoryService: InterestCategoryService,
  ) {
    this.services = {
      feedback: feedbackService,
      introduction: introductionService,
      interestCategory: interestCategoryService,
    };
  }

  async seedInitialize(): Promise<void> {
    const config =
      this.configService.getOrThrow<Record<SeedKey, boolean>>('seedInitialize');
    this.logger.debug('Starting seed initialization');

    for (const [key, meta] of Object.entries(SEED_PATH)) {
      if (!config[key as SeedKey]) continue;

      try {
        this.logger.debug(`Processing seed for ${key}`);
        const seedData = this.jsonSeedService.readSeed(meta.path);
        this.logger.log(`Read ${seedData.length} records from ${meta.path}`);

        const service = this.services[key as SeedKey];
        const createMethod = `createMany${key.charAt(0).toUpperCase() + key.slice(1)}FromSeed`;
        if (typeof service[createMethod] !== 'function') {
          throw new Error(
            `Method ${createMethod} not found in service for ${key}`,
          );
        }

        await (service[createMethod] as (data: any[]) => Promise<any>)(
          seedData,
        );
        this.logger.log(`Inserted ${seedData.length} records for ${key}`);
      } catch (error) {
        this.logger.error(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Failed to process seed for ${key}: ${error.message}`,
        );
        throw error;
      }
    }

    this.logger.log('Seed initialization completed');
  }

  async extractDataFromDb(): Promise<void> {
    this.logger.debug('Starting data extraction from database');

    for (const [key, meta] of Object.entries(SEED_PATH)) {
      const service = this.services[key as SeedKey];
      if (!service) {
        throw new Error(`Service ${key} not found`);
      }

      const findMethod = `findAll${key.charAt(0).toUpperCase() + key.slice(1)}`;
      if (typeof service[findMethod] !== 'function') {
        throw new Error(`Method ${findMethod} not found in service for ${key}`);
      }

      this.logger.debug(`Extracting data for ${key}`);
      const data = await (service[findMethod] as () => Promise<any[]>)();
      this.logger.log(`Extracted ${data.length} records from ${key}`);
      this.jsonSeedService.writeSeed(meta.path, data);
      this.logger.log(`Wrote seed data to ${meta.path}`);
    }

    this.logger.log('Data extraction completed');
  }
}

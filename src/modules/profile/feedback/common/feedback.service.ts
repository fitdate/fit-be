import { Injectable, Logger } from '@nestjs/common';
import { Feedback } from '../entities/feedback.entity';
import { Repository, In, ILike } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateManyFeedbackDto } from '../dto/create-many-feedback.dto';

interface CreateManyFeedbackResponse {
  created: Feedback[];
  skipped: string[];
}

interface FeedbackInput {
  name: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  async createManyFeedbackFromSeed(
    feedbacks: FeedbackInput[],
  ): Promise<CreateManyFeedbackResponse> {
    this.logger.debug(`Creating ${feedbacks.length} feedbacks from seed`);
    return this.createManyFeedback({ feedbacks });
  }

  async createManyFeedback(
    createManyFeedbackDto: CreateManyFeedbackDto,
  ): Promise<CreateManyFeedbackResponse> {
    const names = createManyFeedbackDto.feedbacks.map((dto) => dto.name);
    this.logger.debug(
      `Checking existing feedbacks for names: ${names.join(', ')}`,
    );

    const existingFeedbacks = await this.feedbackRepository.find({
      where: { name: In(names) },
    });

    const existingNames = existingFeedbacks.map((feedback) => feedback.name);
    const newFeedbacks = createManyFeedbackDto.feedbacks.filter(
      (dto) => !existingNames.includes(dto.name),
    );

    const skippedNames = createManyFeedbackDto.feedbacks
      .filter((dto) => existingNames.includes(dto.name))
      .map((dto) => dto.name);

    if (skippedNames.length > 0) {
      this.logger.warn(
        `Skipping existing feedback names: ${skippedNames.join(', ')}`,
      );
    }

    if (newFeedbacks.length === 0) {
      this.logger.log('No new feedbacks to create');
      return {
        created: [],
        skipped: skippedNames,
      };
    }

    this.logger.debug(`Creating ${newFeedbacks.length} new feedbacks`);
    const created = await this.feedbackRepository.save(newFeedbacks);
    this.logger.log(`Successfully created ${created.length} feedbacks`);

    return {
      created,
      skipped: skippedNames,
    };
  }

  async findAllFeedback(): Promise<Feedback[]> {
    this.logger.debug('Finding all feedback');
    return this.feedbackRepository.find();
  }

  async searchFeedbacks(name: string): Promise<Feedback[]> {
    this.logger.debug(`Searching feedbacks with name: ${name}`);
    const feedbacks = await this.feedbackRepository.find({
      where: { name: ILike(`%${name}%`) },
    });

    if (feedbacks.length === 0) {
      this.logger.debug(`No feedbacks found for name: ${name}`);
      return [];
    }

    this.logger.log(`Found ${feedbacks.length} feedbacks for name: ${name}`);
    return feedbacks;
  }

  async findManyFeedbacks(ids: number[]): Promise<Feedback[]> {
    this.logger.debug(`Fetching feedbacks with IDs: ${ids.join(', ')}`);
    const feedbacks = await this.feedbackRepository.find({
      where: { id: In(ids) },
    });
    this.logger.log(`Found ${feedbacks.length} feedbacks`);
    return feedbacks;
  }
}

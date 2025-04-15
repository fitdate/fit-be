import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { Feedback } from '../entities/feedback.entity';
import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateFeedbackDto } from '../dto/update-feedback.dto';
import { FeedbackResponseDto } from '../dto/feedback-response.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  async createFeedback(
    feedbackCreateDto: CreateFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    const feedback = await this.feedbackRepository.findOne({
      where: {
        name: feedbackCreateDto.name,
      },
    });

    if (feedback) {
      throw new ConflictException('이미 존재하는 피드백입니다.');
    }

    const newFeedback = await this.feedbackRepository.save(feedbackCreateDto);

    return {
      id: newFeedback.id,
      name: newFeedback.name,
    };
  }

  findAllFeedback(): Promise<Feedback[]> {
    return this.feedbackRepository.find();
  }

  async findOneFeedback(id: string): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id },
    });

    if (!feedback) {
      throw new NotFoundException('존재하지 않는 피드백입니다.');
    }

    return feedback;
  }

  async updateFeedback(
    id: string,
    feedbackUpdateDto: UpdateFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    await this.findOneFeedback(id);
    if (feedbackUpdateDto.name) {
      const existing = await this.feedbackRepository.findOne({
        where: {
          name: feedbackUpdateDto.name,
          id: Not(id),
        },
      });
      if (existing) {
        throw new ConflictException('이미 존재하는 피드백입니다.');
      }
    }

    await this.feedbackRepository.update(id, feedbackUpdateDto);
    const updatedFeedback = await this.findOneFeedback(id);
    return {
      id: updatedFeedback.id,
      name: updatedFeedback.name,
    };
  }

  async deleteFeedback(id: string): Promise<FeedbackResponseDto> {
    const feedback = await this.findOneFeedback(id);
    await this.feedbackRepository.delete(id);
    return {
      id: feedback.id,
      name: feedback.name,
    };
  }
}

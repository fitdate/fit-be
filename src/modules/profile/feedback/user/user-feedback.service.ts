import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFeedback } from '../entities/user-feedback.entity';
import { CreateUserFeedbackDto } from '../dto/create-user-feedback.dto';

@Injectable()
export class UserFeedbackService {
  constructor(
    @InjectRepository(UserFeedback)
    private readonly userFeedbackRepository: Repository<UserFeedback>,
  ) {}

  async createUserFeedback(
    dto: CreateUserFeedbackDto,
  ): Promise<UserFeedback[]> {
    const userFeedbacks = dto.feedbackIds.map((feedbackId) =>
      this.userFeedbackRepository.create({
        feedback: { id: feedbackId },
        profile: { id: dto.profileId },
      }),
    );

    return this.userFeedbackRepository.save(userFeedbacks);
  }

  async updateUserFeedback(
    dto: CreateUserFeedbackDto,
  ): Promise<UserFeedback[]> {
    const existingUserFeedbacks = await this.userFeedbackRepository.find({
      where: { profile: { id: dto.profileId } },
      relations: ['feedback'],
    });

    const existingFeedbackIds = existingUserFeedbacks.map(
      (userFeedback) => userFeedback.feedback.id,
    );

    const feedbacksToRemove = existingUserFeedbacks.filter(
      (userFeedback) => !dto.feedbackIds.includes(userFeedback.feedback.id),
    );

    if (feedbacksToRemove.length > 0) {
      await this.userFeedbackRepository.remove(feedbacksToRemove);
    }

    const feedbacksToAdd = dto.feedbackIds.filter(
      (id) => !existingFeedbackIds.includes(id),
    );

    if (feedbacksToAdd.length > 0) {
      const newFeedbacks = feedbacksToAdd.map((feedbackId) =>
        this.userFeedbackRepository.create({
          feedback: { id: feedbackId },
          profile: { id: dto.profileId },
        }),
      );

      await this.userFeedbackRepository.save(newFeedbacks);
    }

    return this.userFeedbackRepository.find({
      where: { profile: { id: dto.profileId } },
      relations: ['feedback'],
      order: { id: 'ASC' },
    });
  }
}

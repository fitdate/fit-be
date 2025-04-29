import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFeedback } from '../entities/user-feedback.entity';
import { CreateUserFeedbackDto } from '../dto/create-user-feedback.dto';
import { FeedbackService } from '../common/feedback.service';
@Injectable()
export class UserFeedbackService {
  constructor(
    @InjectRepository(UserFeedback)
    private readonly userFeedbackRepository: Repository<UserFeedback>,
    private readonly feedbackService: FeedbackService,
  ) {}

  // 사용자 피드백 생성
  async createUserFeedback(
    dto: CreateUserFeedbackDto,
  ): Promise<UserFeedback[]> {
    const userFeedbacks: UserFeedback[] = [];

    for (const name of dto.feedbackNames) {
      let feedback = (await this.feedbackService.searchFeedbacks(name))[0];
      if (!feedback) {
        feedback = await this.feedbackService.createFeedbackCategory({
          name,
        });
      }
      const userFeedback = this.userFeedbackRepository.create({
        feedback: { id: feedback.id },
        profile: { id: dto.profileId },
      });

      userFeedbacks.push(userFeedback);
    }
    return this.userFeedbackRepository.save(userFeedbacks);
  }

  // 사용자 피드백 업데이트
  async updateUserFeedback(
    dto: CreateUserFeedbackDto,
  ): Promise<UserFeedback[]> {
    const feedbacks = await this.feedbackService.findAllFeedback();

    const foundNames = feedbacks.map((feedback) => feedback.name);
    const missingNames = dto.feedbackNames.filter(
      (name) => !foundNames.includes(name),
    );

    if (missingNames.length > 0) {
      throw new NotFoundException(
        `The following feedbacks do not exist: ${missingNames.join(', ')}`,
      );
    }

    const existingUserFeedbacks = await this.userFeedbackRepository.find({
      where: { profile: { id: dto.profileId } },
      relations: ['feedback'],
    });

    const existingFeedbackIds = existingUserFeedbacks.map(
      (userFeedback) => userFeedback.feedback.id,
    );

    const feedbacksToRemove = existingUserFeedbacks.filter(
      (userFeedback) =>
        !dto.feedbackIds.some((id) => id === userFeedback.feedback.id),
    );

    if (feedbacksToRemove.length > 0) {
      await this.userFeedbackRepository.remove(feedbacksToRemove);
    }

    const feedbacksToAdd = dto.feedbackIds.filter(
      (id) => !existingFeedbackIds.includes(id),
    );

    if (feedbacksToAdd.length > 0) {
      const newFeedbacks = feedbacksToAdd.map((id) =>
        this.userFeedbackRepository.create({
          feedback: { id },
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

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFeedbackService } from './user-feedback.service';
import { UserFeedback } from '../entities/user-feedback.entity';
import { FeedbackModule } from '../common/feedback.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserFeedback]), FeedbackModule],
  controllers: [],
  providers: [UserFeedbackService],
  exports: [UserFeedbackService],
})
export class UserFeedbackModule {}

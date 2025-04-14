import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { Feedback } from '../entities/feedback.entity';
import { FeedbackController } from './admin-feedback.controller';
import { FeedbackService } from './admin-feedback.service';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback])],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class AdminFeedbackModule {}

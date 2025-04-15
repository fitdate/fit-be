import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { ProfileImage } from './profile-image/entities/profile-image.entity';
import { Mbti } from './mbti/entities/mbti.entity';
import { InterestLocation } from './interest-location/entities/interest-location.entity';
import { ProfileImageModule } from './profile-image/profile-image.module';
import { MbtiModule } from './mbti/mbti.module';
import { UserInterestCategory } from './interest-category/entities/user-interest-category.entity';
import { UserFeedback } from './feedback/entities/user-feedback.entity';
import { UserIntroduction } from './introduction/entities/user-introduction.entity';
import { UserIntroductionModule } from './introduction/user/user-introduction.module';
import { UserFeedbackModule } from './feedback/user/user-feedback.module';
import { UserInterestCategoryModule } from './interest-category/user/user-interest-category.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Profile,
      ProfileImage,
      Mbti,
      UserInterestCategory,
      InterestLocation,
      UserFeedback,
      UserIntroduction,
    ]),
    UserInterestCategoryModule,
    ProfileImageModule,
    MbtiModule,
    UserFeedbackModule,
    UserIntroductionModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}

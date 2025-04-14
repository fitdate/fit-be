import { Module } from '@nestjs/common';
import { SeedManagerService } from './seed-manager.service';
import { SeedManagerController } from './seed-manager.controller';
import { JsonSeedModule } from './json-seed/json-seed.module';
import { ConfigModule } from '@nestjs/config';
import { IntroductionModule } from '../profile/introduction/common/introduction.module';
import { FeedbackModule } from '../profile/feedback/common/feedback.module';
import { InterestCategoryModule } from '../profile/interest-category/common/interest-category.module';

@Module({
  imports: [
    ConfigModule,
    JsonSeedModule,
    IntroductionModule,
    FeedbackModule,
    InterestCategoryModule,
  ],
  controllers: [SeedManagerController],
  providers: [SeedManagerService],
  exports: [SeedManagerService],
})
export class SeedManagerModule {}

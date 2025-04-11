import { Module } from '@nestjs/common';
import { IntroductionService } from './introduction.service';
import { IntroductionController } from './introduction.controller';

@Module({
  controllers: [IntroductionController],
  providers: [IntroductionService],
})
export class IntroductionModule {}

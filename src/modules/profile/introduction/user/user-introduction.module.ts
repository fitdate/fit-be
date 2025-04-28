import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserIntroduction } from '../entities/user-introduction.entity';
import { UserIntroductionService } from './user-introduction.service';
import { IntroductionModule } from '../common/introduction.module';
@Module({
  imports: [TypeOrmModule.forFeature([UserIntroduction]), IntroductionModule],
  providers: [UserIntroductionService],
  exports: [UserIntroductionService],
})
export class UserIntroductionModule {}

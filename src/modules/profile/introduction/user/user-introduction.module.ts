import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserIntroduction } from '../entities/user-introduction.entity';
import { UserIntroductionService } from './user-introduction.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserIntroduction])],
  providers: [UserIntroductionService],
  exports: [UserIntroductionService],
})
export class UserIntroductionModule {}

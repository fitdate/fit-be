import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { Introduction } from '../entities/introduction.entity';
import { AdminIntroductionController } from './admin-introduction.controller';
import { AdminIntroductionService } from './admin-introduction.service';

@Module({
  imports: [TypeOrmModule.forFeature([Introduction])],
  controllers: [AdminIntroductionController],
  providers: [AdminIntroductionService],
})
export class AdminIntroductionModule {}

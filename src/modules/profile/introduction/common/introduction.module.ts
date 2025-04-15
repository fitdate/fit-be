import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Introduction } from '../entities/introduction.entity';
import { IntroductionService } from './introduction.service';
import { IntroductionController } from './introduction.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Introduction])],
  controllers: [IntroductionController],
  providers: [IntroductionService],
  exports: [IntroductionService],
})
export class IntroductionModule {}

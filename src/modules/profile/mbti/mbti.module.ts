import { Module } from '@nestjs/common';
import { MbtiService } from './mbti.service';
import { MbtiController } from './mbti.controller';

@Module({
  controllers: [MbtiController],
  providers: [MbtiService],
})
export class MbtiModule {}

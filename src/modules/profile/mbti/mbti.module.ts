import { Module } from '@nestjs/common';
import { MbtiService } from './mbti.service';
import { MbtiController } from './mbti.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mbti } from './entities/mbti.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Mbti])],
  controllers: [MbtiController],
  providers: [MbtiService],
  exports: [MbtiService],
})
export class MbtiModule {}

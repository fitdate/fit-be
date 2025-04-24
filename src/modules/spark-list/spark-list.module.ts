import { Module } from '@nestjs/common';
import { SparkListService } from './spark-list.service';
import { SparkListController } from './spark-list.controller';

@Module({
  controllers: [SparkListController],
  providers: [SparkListService],
})
export class SparkListModule {}

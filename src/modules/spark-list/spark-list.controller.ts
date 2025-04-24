import { Controller } from '@nestjs/common';
import { SparkListService } from './spark-list.service';

@Controller('spark-list')
export class SparkListController {
  constructor(private readonly sparkListService: SparkListService) {}
}

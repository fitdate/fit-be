import { PartialType } from '@nestjs/swagger';
import { CreateSparkListDto } from './create-spark-list.dto';

export class UpdateSparkListDto extends PartialType(CreateSparkListDto) {}

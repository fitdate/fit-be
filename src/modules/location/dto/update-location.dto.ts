import { PartialType } from '@nestjs/swagger';
import { CreateLocationDto } from './create-region.dto';

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}

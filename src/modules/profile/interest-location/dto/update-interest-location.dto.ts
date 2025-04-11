import { PartialType } from '@nestjs/mapped-types';
import { CreateInterestLocationDto } from './create-interest-location.dto';

export class UpdateInterestLocationDto extends PartialType(CreateInterestLocationDto) {}

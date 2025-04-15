import { PartialType } from '@nestjs/swagger';
import { CreateIntroductionDto } from './create-introduction.dto';

export class UpdateIntroductionDto extends PartialType(CreateIntroductionDto) {}

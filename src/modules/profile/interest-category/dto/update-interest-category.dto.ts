import { PartialType } from '@nestjs/mapped-types';
import { CreateInterestCategoryDto } from './create-interest-category.dto';

export class UpdateInterestCategoryDto extends PartialType(CreateInterestCategoryDto) {}

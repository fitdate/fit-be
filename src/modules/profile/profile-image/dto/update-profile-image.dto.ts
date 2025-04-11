import { PartialType } from '@nestjs/mapped-types';
import { CreateProfileImageDto } from './create-profile-image.dto';

export class UpdateProfileImageDto extends PartialType(CreateProfileImageDto) {}

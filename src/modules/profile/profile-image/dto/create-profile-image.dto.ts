import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateProfileImageDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID('4')
  profileId: string;

  @IsNotEmpty()
  @IsString()
  profileImageName: string;
}

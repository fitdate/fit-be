import { IsString, IsNotEmpty } from 'class-validator';

export class FindEmailDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

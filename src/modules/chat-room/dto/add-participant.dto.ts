import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddParticipantDto {
  @IsUUID('4')
  @IsNotEmpty()
  userId: string;
}

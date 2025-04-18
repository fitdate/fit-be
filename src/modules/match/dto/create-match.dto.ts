import { IsUUID, IsString } from 'class-validator';

export class CreateMatchDto {
  @IsString()
  matchId: string;

  @IsUUID()
  user1Id: string;

  @IsUUID()
  user2Id: string;
}

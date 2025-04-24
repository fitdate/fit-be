import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SelectAllMatchDto {
  @ApiProperty({
    description: '매칭 ID',
    type: 'string',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'matchId는 필수입니다.' })
  @IsUUID()
  matchId: string;

  @ApiProperty({
    description: '첫 번째 선택된 사용자 ID',
    type: 'string',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'firstSelectedUserId는 필수입니다.' })
  @IsUUID()
  firstSelectedUserId: string;

  @ApiProperty({
    description: '두 번째 선택된 사용자 ID',
    type: 'string',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'secondSelectedUserId는 필수입니다.' })
  @IsUUID()
  secondSelectedUserId: string;
}

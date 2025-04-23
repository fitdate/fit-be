import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SelectMatchDto {
  @ApiProperty({
    description: '매칭 ID',
    type: 'string',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'matchId는 필수입니다.' })
  @IsUUID()
  matchId: string;

  @ApiProperty({
    description: '선택된 사용자 ID',
    type: 'string',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'selectedUserId는 필수입니다.' })
  @IsUUID()
  selectedUserId: string;
}

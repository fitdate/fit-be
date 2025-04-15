import { ApiProperty } from '@nestjs/swagger';
import { MbtiType, MBTI_VALUES } from '../constants/mbti.constants';

export class MbtiRecommendResponse {
  @ApiProperty({ enum: MBTI_VALUES, isArray: true })
  recommendations: MbtiType[];
}

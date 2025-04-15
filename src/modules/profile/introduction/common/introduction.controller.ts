import { Controller, Get, Param } from '@nestjs/common';
import { IntroductionService } from './introduction.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Introduction } from '../entities/introduction.entity';

@ApiTags('introduction')
@Controller('introduction')
export class IntroductionController {
  constructor(private readonly introductionService: IntroductionService) {}

  @Get()
  @ApiOperation({ summary: '모든 소개 조회' })
  @ApiResponse({
    status: 200,
    description: '소개 목록 반환',
    type: [Introduction],
  })
  findAllIntroduction() {
    return this.introductionService.findAllIntroduction();
  }

  @Get(':name')
  @ApiOperation({ summary: '특정 소개 조회' })
  @ApiResponse({
    status: 200,
    description: '소개 정보 반환',
    type: [Introduction],
  })
  @ApiResponse({ status: 204, description: '결과 없음' })
  searchIntroductions(@Param('name') name: string) {
    return this.introductionService.searchIntroductions(name);
  }
}

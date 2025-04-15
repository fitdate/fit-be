import { Controller, Get, Param } from '@nestjs/common';
import { InterestCategoryService } from './interest-category.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InterestCategory } from '../entities/interest-category.entity';

@ApiTags('interest-category')
@Controller('interest-category')
export class InterestCategoryController {
  constructor(
    private readonly interestCategoryService: InterestCategoryService,
  ) {}

  @Get()
  @ApiOperation({ summary: '모든 관심사 카테고리 조회' })
  @ApiResponse({
    status: 200,
    description: '관심사 카테고리 목록 반환',
    type: [InterestCategory],
  })
  findAllInterestCategory() {
    return this.interestCategoryService.findAllInterestCategory();
  }

  @Get(':name')
  @ApiOperation({ summary: '특정 관심사 카테고리 조회' })
  @ApiResponse({
    status: 200,
    description: '관심사 카테고리 정보 반환',
    type: [InterestCategory],
  })
  @ApiResponse({ status: 204, description: '결과 없음' })
  searchInterestCategories(@Param('name') name: string) {
    return this.interestCategoryService.searchInterestCategories(name);
  }
}

import { Controller, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AdminInterestCategoryService } from './admin-interest-category.service';
import { CreateInterestCategoryDto } from '../dto/create-interest-category.dto';
import { UpdateInterestCategoryDto } from '../dto/update-interest-category.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InterestCategory } from '../entities/interest-category.entity';
import { RBAC } from 'src/common/decorator/rbac.decorator';
import { UserRole } from 'src/common/enum/user-role.enum';
import { InterestCategoryResponseDto } from '../dto/interest-category-response.dto';

@RBAC(UserRole.ADMIN)
@ApiTags('admin/interest-category')
@Controller('admin/interest-category')
export class AdminInterestCategoryController {
  constructor(
    private readonly adminInterestCategoryService: AdminInterestCategoryService,
  ) {}

  @Post()
  @ApiOperation({ summary: '관심사 카테고리 생성' })
  @ApiResponse({
    status: 201,
    description: '관심사 카테고리가 성공적으로 생성됨',
    type: [InterestCategory],
  })
  @ApiResponse({ status: 409, description: '이미 존재하는 관심사 카테고리' })
  createInterestCategory(
    @Body()
    createInterestCategoryDto: CreateInterestCategoryDto,
  ): Promise<InterestCategoryResponseDto> {
    return this.adminInterestCategoryService.createInterestCategory(
      createInterestCategoryDto,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: '관심사 카테고리 수정' })
  @ApiResponse({
    status: 200,
    description: '관심사 카테고리가 성공적으로 수정됨',
    type: [InterestCategory],
  })
  @ApiResponse({ status: 404, description: '존재하지 않는 관심사 카테고리' })
  @ApiResponse({ status: 409, description: '이미 존재하는 관심사 카테고리' })
  updateInterestCategory(
    @Param('id') id: string,
    @Body()
    updateInterestCategoryDto: UpdateInterestCategoryDto,
  ): Promise<InterestCategoryResponseDto> {
    return this.adminInterestCategoryService.updateInterestCategory(
      id,
      updateInterestCategoryDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: '관심사 카테고리 삭제' })
  @ApiResponse({
    status: 200,
    description: '관심사 카테고리가 성공적으로 삭제됨',
    type: [InterestCategory],
  })
  @ApiResponse({ status: 404, description: '존재하지 않는 관심사 카테고리' })
  deleteInterestCategory(
    @Param('id') id: string,
  ): Promise<InterestCategoryResponseDto> {
    return this.adminInterestCategoryService.deleteInterestCategory(id);
  }
}

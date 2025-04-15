import { Controller, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminIntroductionService } from './admin-introduction.service';
import { CreateIntroductionDto } from '../dto/create-introduction.dto';
import { UpdateIntroductionDto } from '../dto/update-introduction.dto';
import { IntroductionResponseDto } from '../dto/introduction-response.dto';
import { RBAC } from 'src/common/decorator/rbac.decorator';
import { UserRole } from 'src/common/enum/user-role.enum';

@RBAC(UserRole.ADMIN)
@ApiTags('admin/introduction')
@Controller('admin/introduction')
export class AdminIntroductionController {
  constructor(
    private readonly adminIntroductionService: AdminIntroductionService,
  ) {}

  @Post()
  @ApiOperation({ summary: '소개 생성 (관리자)' })
  @ApiResponse({
    status: 201,
    description: '소개가 성공적으로 생성됨',
    type: [IntroductionResponseDto],
  })
  @ApiResponse({ status: 409, description: '이미 존재하는 소개' })
  async createIntroduction(
    @Body() createIntroductionDto: CreateIntroductionDto,
  ): Promise<IntroductionResponseDto> {
    return this.adminIntroductionService.createIntroduction(
      createIntroductionDto,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: '소개 수정 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '소개가 성공적으로 수정됨',
    type: [IntroductionResponseDto],
  })
  @ApiResponse({ status: 404, description: '존재하지 않는 소개' })
  @ApiResponse({ status: 409, description: '이미 존재하는 소개' })
  async updateIntroduction(
    @Param('id') id: string,
    @Body() updateIntroductionDto: UpdateIntroductionDto,
  ): Promise<IntroductionResponseDto> {
    return this.adminIntroductionService.updateIntroduction(
      id,
      updateIntroductionDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: '소개 삭제 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '소개가 성공적으로 삭제됨',
    type: [IntroductionResponseDto],
  })
  @ApiResponse({ status: 404, description: '존재하지 않는 소개' })
  async deleteIntroduction(
    @Param('id') id: string,
  ): Promise<IntroductionResponseDto> {
    return this.adminIntroductionService.deleteIntroduction(id);
  }
}

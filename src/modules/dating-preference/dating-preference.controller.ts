import { DatingPreferenceService } from './dating-preference.service';
import { Controller, Get, Patch, Body } from '@nestjs/common';
import { UpdateDatingPreferenceDto } from './dto/update-dating-preference.dto';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
@Controller('dating-preference')
export class DatingPreferenceController {
  constructor(
    private readonly datingPreferenceService: DatingPreferenceService,
  ) {}

  @ApiOperation({
    summary: '소개받을 이성 조회',
    description: '현재 사용자의 소개받을 이성 설정을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '소개받을 이성 설정을 성공적으로 조회했습니다.',
  })
  @Get('dating-preference')
  getDatingPreference(@UserId() userId: string) {
    return this.datingPreferenceService.getDatingPreference(userId);
  }

  @ApiOperation({
    summary: '소개받을 이성 목록 조회',
    description: '현재 사용자의 소개받을 이성 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '소개받을 이성 목록을 성공적으로 조회했습니다.',
  })
  @Get('dating-preference/list')
  getDatingPreferenceList(@UserId() userId: string) {
    return this.datingPreferenceService.getDatingPreferenceList(userId);
  }

  @ApiOperation({
    summary: '소개받을 이성 설정 업데이트',
    description: '현재 사용자의 소개받을 이성 설정을 업데이트합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '소개받을 이성 설정을 성공적으로 업데이트했습니다.',
  })
  @ApiParam({
    name: 'updateDatingPreferenceDto',
    description: '소개받을 이성 설정 업데이트 정보',
    type: UpdateDatingPreferenceDto,
  })
  @Patch('dating-preference')
  updateDatingPreference(
    @UserId() userId: string,
    @Body() updateDatingPreferenceDto: UpdateDatingPreferenceDto,
  ) {
    return this.datingPreferenceService.updateDatingPreference(
      userId,
      updateDatingPreferenceDto,
    );
  }
}

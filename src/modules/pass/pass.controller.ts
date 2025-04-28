import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PassService } from './pass.service';
import { UserId } from '../../common/decorator/get-user.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('pass')
@Controller('pass')
@UsePipes(new ValidationPipe({ transform: true }))
export class PassController {
  constructor(private readonly passService: PassService) {}

  @Post('both')
  @ApiOperation({ summary: '매칭 페이지에서 X버튼을 눌러 둘 다 선택하지 않음' })
  @ApiResponse({ status: 200, description: '성공적으로 거절됨' })
  async passBothUsers(
    @UserId() userId: string,
    @Body('passedUserId') passedUserId: string,
  ): Promise<void> {
    await this.passService.passBothUsers(userId, passedUserId);
  }

  @Post('match')
  @ApiOperation({ summary: '호감페이지에서 매칭 요청 거절' })
  @ApiResponse({ status: 200, description: '성공적으로 거절됨' })
  async passMatchRequest(
    @UserId() userId: string,
    @Body('passedUserId') passedUserId: string,
  ): Promise<void> {
    await this.passService.passMatchRequest(userId, passedUserId);
  }

  @Post('coffee-chat')
  @ApiOperation({ summary: '호감페이지에서 커피챗 요청 거절' })
  @ApiResponse({ status: 200, description: '성공적으로 거절됨' })
  async passCoffeeChatRequest(
    @UserId() userId: string,
    @Body('passedUserId') passedUserId: string,
  ): Promise<void> {
    await this.passService.passCoffeeChatRequest(userId, passedUserId);
  }

  @Get('check/:passedUserId')
  @ApiOperation({ summary: '특정 사용자를 거절했는지 확인' })
  @ApiResponse({
    status: 200,
    description: '거절 여부 반환',
    type: Boolean,
  })
  async checkPassStatus(
    @UserId() userId: string,
    @Param('passedUserId') passedUserId: string,
  ): Promise<boolean> {
    return await this.passService.hasPassedUser(userId, passedUserId);
  }
}

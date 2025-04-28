import {
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
  Param,
} from '@nestjs/common';
import { PassService } from './pass.service';
import { UserId } from '../../common/decorator/get-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('pass')
@Controller('pass')
@UsePipes(new ValidationPipe({ transform: true }))
export class PassController {
  constructor(private readonly passService: PassService) {}

  @Post('both/:passedUserId')
  @ApiOperation({ summary: '매칭 페이지에서 X버튼을 눌러 둘 다 선택하지 않음' })
  @ApiParam({ name: 'passedUserId', description: '거절할 사용자 ID' })
  @ApiResponse({ status: 200, description: '성공적으로 거절됨' })
  async passBothUsers(
    @UserId() userId: string,
    @Param('passedUserId') passedUserId: string,
  ): Promise<void> {
    await this.passService.passBothUsers(userId, passedUserId);
  }

  @Post('match/:passedUserId')
  @ApiOperation({ summary: '호감페이지에서 매칭 요청 거절' })
  @ApiParam({ name: 'passedUserId', description: '거절할 사용자 ID' })
  @ApiResponse({ status: 200, description: '성공적으로 거절됨' })
  async passMatchRequest(
    @UserId() userId: string,
    @Param('passedUserId') passedUserId: string,
  ): Promise<void> {
    await this.passService.passMatchRequest(userId, passedUserId);
  }

  @Post('coffee-chat/:passedUserId')
  @ApiOperation({ summary: '호감페이지에서 커피챗 요청 거절' })
  @ApiParam({ name: 'passedUserId', description: '거절할 사용자 ID' })
  @ApiResponse({ status: 200, description: '성공적으로 거절됨' })
  async passCoffeeChatRequest(
    @UserId() userId: string,
    @Param('passedUserId') passedUserId: string,
  ): Promise<void> {
    await this.passService.passCoffeeChatRequest(userId, passedUserId);
  }
}

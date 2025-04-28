import {
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
  Param,
  Body,
} from '@nestjs/common';
import { PassService } from './pass.service';
import { UserId } from '../../common/decorator/get-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Pass')
@Controller('pass')
@UsePipes(new ValidationPipe({ transform: true }))
export class PassController {
  constructor(private readonly passService: PassService) {}

  @Post('both')
  @ApiOperation({ summary: '매칭 페이지에서 X버튼을 눌러 둘 다 선택하지 않음' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        passedUserId1: {
          type: 'string',
          description: '첫 번째 거절할 사용자 ID',
        },
        passedUserId2: {
          type: 'string',
          description: '두 번째 거절할 사용자 ID',
        },
      },
      required: ['passedUserId1', 'passedUserId2'],
    },
  })
  @ApiResponse({ status: 200, description: '성공적으로 거절됨' })
  async passBothUsers(
    @UserId() userId: string,
    @Body('passedUserId1') passedUserId1: string,
    @Body('passedUserId2') passedUserId2: string,
  ): Promise<void> {
    await this.passService.passBothUsers(userId, passedUserId1);
    await this.passService.passBothUsers(userId, passedUserId2);
  }

  @Post('match/:passedUserId')
  @ApiOperation({ summary: '호감페이지에서 매칭 요청 거절' })
  @ApiParam({ name: 'passedUserId', description: '거절할 사용자 ID' })
  @ApiResponse({
    status: 200,
    description: '매칭 거절 완료 (항상 isSuccess: false 반환)',
    schema: {
      type: 'object',
      properties: {
        isSuccess: {
          type: 'boolean',
          description: '매칭 거절 성공 여부 (거절 시 항상 false)',
          example: false,
        },
      },
    },
  })
  async passMatchRequest(
    @UserId() userId: string,
    @Param('passedUserId') passedUserId: string,
  ): Promise<{ isSuccess: boolean }> {
    return await this.passService.passMatchRequest(userId, passedUserId);
  }

  @Post('coffee-chat/:passedUserId')
  @ApiOperation({ summary: '호감페이지에서 커피챗 요청 거절' })
  @ApiParam({ name: 'passedUserId', description: '거절할 사용자 ID' })
  @ApiResponse({
    status: 200,
    description: '커피챗 거절 완료 (항상 isSuccess: false 반환)',
    schema: {
      type: 'object',
      properties: {
        isSuccess: {
          type: 'boolean',
          description: '커피챗 거절 성공 여부 (거절 시 항상 false)',
          example: false,
        },
      },
    },
  })
  async passCoffeeChatRequest(
    @UserId() userId: string,
    @Param('passedUserId') passedUserId: string,
  ): Promise<{ isSuccess: boolean }> {
    return await this.passService.passCoffeeChatRequest(userId, passedUserId);
  }
}

import { Controller, Get, UseGuards, Post, Body } from '@nestjs/common';
import { MatchService } from './match.service';
import { JwtAuthGuard } from '../auth/strategy/jwt.strategy';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Matching')
@Controller('match')
@UseGuards(JwtAuthGuard)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @ApiOperation({
    summary: '랜덤 매칭 4명 조회',
    description: '성별이 다른 4명의 랜덤 매칭을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '랜덤 매칭 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @Get('random')
  async findRandomMatches(@CurrentUser() user: User) {
    return this.matchService.findRandomMatches(user.id);
  }

  @ApiOperation({
    summary: '선택하기 버튼 클릭',
    description:
      '월드컵 페이지에서 선택하기 버튼을 클릭하면 선택된 사용자에게 알림을 보냅니다.',
  })
  @ApiResponse({ status: 200, description: '알림 전송 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '매칭을 찾을 수 없음' })
  @Post('select')
  async selectMatch(
    @CurrentUser() user: User,
    @Body() body: { matchId: string; selectedUserId: string },
  ) {
    return this.matchService.sendSelectionNotification(
      body.matchId,
      body.selectedUserId,
      user.id,
    );
  }

  @ApiOperation({
    summary: '모두 선택하기 버튼 클릭',
    description:
      '월드컵 페이지에서 모두 선택하기 버튼을 클릭하면 두 명의 사용자에게 알림을 보냅니다.',
  })
  @ApiResponse({ status: 200, description: '알림 전송 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '매칭을 찾을 수 없음' })
  @Post('select-all')
  async selectAllMatch(
    @CurrentUser() user: User,
    @Body() body: { matchId: string },
  ) {
    return this.matchService.sendAllSelectionNotification(
      body.matchId,
      user.id,
    );
  }

  @ApiOperation({
    summary: '대화하러 가기 버튼 클릭',
    description:
      '매칭 결과 페이지에서 대화하러 가기 버튼을 클릭하면 상대방에게 채팅방 입장 알림을 보냅니다.',
  })
  @ApiResponse({ status: 200, description: '알림 전송 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '매칭을 찾을 수 없음' })
  @Post('enter-chat')
  async enterChat(
    @CurrentUser() user: User,
    @Body() body: { matchId: string },
  ) {
    return this.matchService.sendChatRoomEntryNotification(
      body.matchId,
      user.id,
    );
  }
}

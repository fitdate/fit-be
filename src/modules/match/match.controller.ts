import {
  Controller,
  Get,
  // UseGuards,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { MatchService } from './match.service';
// import { JwtAuthGuard } from '../auth/strategy/jwt.strategy';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorator/public.decorator';
import { SelectMatchDto } from './dto/select-match.dto';

@ApiTags('Matching')
@Controller('match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @ApiOperation({
    summary: '비로그인 사용자 랜덤 매칭 조회',
    description: '남자-남자, 여자-여자 매칭을 각각 1쌍씩 랜덤으로 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '랜덤 매칭 조회 성공' })
  @Public()
  @Get('random/public')
  async findRandomPublicMatches() {
    return this.matchService.findRandomPublicMatches();
  }

  @ApiOperation({
    summary: '로그인 사용자 랜덤 매칭 4명 조회',
    description: '성별이 다른 4명의 랜덤 매칭을 조회합니다.',
  })
  // @UseGuards(JwtAuthGuard)
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
  // @UseGuards(JwtAuthGuard)
  @Post('select')
  async selectMatch(
    @CurrentUser() user: User,
    @Body() selectMatchDto: SelectMatchDto,
  ) {
    if (!user) {
      throw new BadRequestException('사용자 정보를 찾을 수 없습니다.');
    }
    if (!selectMatchDto.selectedUserId) {
      throw new BadRequestException('selectedUserId는 필수입니다.');
    }
    if (!selectMatchDto.matchId) {
      throw new BadRequestException('matchId는 필수입니다.');
    }
    return this.matchService.sendSelectionNotification(
      selectMatchDto.matchId,
      selectMatchDto.selectedUserId,
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
  // @UseGuards(JwtAuthGuard)
  @Post('select-all')
  async selectAllMatch(
    @CurrentUser() user: User,
    @Body() selectMatchDto: SelectMatchDto,
  ) {
    return this.matchService.sendAllSelectionNotification(
      selectMatchDto.matchId,
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
  // @UseGuards(JwtAuthGuard)
  @Post('enter-chat')
  async enterChat(
    @CurrentUser() user: User,
    @Body() selectMatchDto: SelectMatchDto,
  ) {
    if (!selectMatchDto || !selectMatchDto.matchId) {
      throw new BadRequestException('matchId는 필수입니다.');
    }
    return this.matchService.sendChatRoomEntryNotification(
      selectMatchDto.matchId,
      user.id,
    );
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { MatchService } from './match.service';
import { UserId } from '../../common/decorator/get-user.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorator/public.decorator';
import { SelectMatchDto } from './dto/select-match.dto';
import { Logger } from '@nestjs/common';
import { SelectAllMatchDto } from './dto/select-all-match.dto';

@ApiTags('Matching')
@Controller('match')
export class MatchController {
  private readonly logger = new Logger(MatchController.name);

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
  @ApiResponse({ status: 200, description: '랜덤 매칭 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @Get('random')
  async findRandomMatches(@UserId() userId: string) {
    this.logger.log(`[findRandomMatches] 사용자 ID: ${userId}`);

    if (!userId) {
      this.logger.error('[findRandomMatches] 사용자 ID 없음');
      throw new BadRequestException('사용자 정보를 찾을 수 없습니다.');
    }

    return this.matchService.findRandomMatches(userId);
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
    @UserId() userId: string,
    @Body() selectMatchDto: SelectMatchDto,
  ) {
    if (!userId) {
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
      userId,
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
    @UserId() userId: string,
    @Body() selectAllMatchDto: SelectAllMatchDto,
  ) {
    if (!userId) {
      throw new BadRequestException('사용자 정보를 찾을 수 없습니다.');
    }
    return this.matchService.sendAllSelectionNotification(
      selectAllMatchDto.matchId,
      userId,
      selectAllMatchDto.firstSelectedUserId,
      selectAllMatchDto.secondSelectedUserId,
    );
  }

  // @ApiOperation({
  //   summary: '대화하러 가기 버튼 클릭',
  //   description:
  //     '매칭 결과 페이지에서 대화하러 가기 버튼을 클릭하면 상대방에게 채팅방 입장 알림을 보냅니다.',
  // })
  // @ApiResponse({ status: 200, description: '알림 전송 성공' })
  // @ApiResponse({ status: 401, description: '인증 실패' })
  // @ApiResponse({ status: 404, description: '매칭을 찾을 수 없음' })
  // @Post('enter-chat')
  // async enterChat(
  //   @UserId() userId: string,
  //   @Body() selectMatchDto: SelectMatchDto,
  // ) {
  //   if (!selectMatchDto || !selectMatchDto.matchId) {
  //     throw new BadRequestException('matchId는 필수입니다.');
  //   }
  //   return this.matchService.sendChatRoomEntryNotification(
  //     selectMatchDto.matchId,
  //     userId,
  //   );
  // }
}

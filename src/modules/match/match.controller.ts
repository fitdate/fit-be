import { Controller, Get, UseGuards } from '@nestjs/common';
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
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { MatchService } from './match.service';
import { JwtAuthGuard } from '../auth/strategy/jwt.strategy';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('match')
@UseGuards(JwtAuthGuard)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get('random')
  async findRandomMatches(@CurrentUser() user: User) {
    return this.matchService.findRandomMatches(user.id);
  }
}

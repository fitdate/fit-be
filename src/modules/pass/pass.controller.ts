import { Controller, Post, Param, UseGuards, Get } from '@nestjs/common';
import { PassService } from './pass.service';
import { User } from '../user/entities/user.entity';
import { JwtAuthGuard } from '../auth/strategy/jwt.strategy';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@Controller('passes')
@UseGuards(JwtAuthGuard)
export class PassController {
  constructor(private readonly passService: PassService) {}

  @Post(':passedUserId')
  async passUser(
    @GetUser() user: User,
    @Param('passedUserId') passedUserId: string,
  ) {
    return this.passService.passUser(user.id, parseInt(passedUserId));
  }

  @Get(':passedUserId/status')
  async checkPassStatus(
    @GetUser() user: User,
    @Param('passedUserId') passedUserId: string,
  ) {
    return this.passService.checkPassStatus(user.id, parseInt(passedUserId));
  }
}

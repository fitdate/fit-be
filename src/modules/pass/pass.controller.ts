import { Controller, Post, Param, UseGuards, Get } from '@nestjs/common';
import { PassService } from './pass.service';
import { User } from '../user/entities/user.entity';
import { JwtAuthGuard } from '../auth/strategy/jwt.strategy';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('passes')
@ApiBearerAuth()
@Controller('passes')
@UseGuards(JwtAuthGuard)
export class PassController {
  constructor(private readonly passService: PassService) {}

  @Post(':passedUserId')
  @ApiOperation({ summary: '사용자 패스' })
  @ApiResponse({ status: 201, description: '패스 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async passUser(
    @GetUser() user: User,
    @Param('passedUserId') passedUserId: string,
  ) {
    return this.passService.passUser(user.id, parseInt(passedUserId));
  }

  @Get(':passedUserId/status')
  @ApiOperation({ summary: '패스 상태 확인' })
  @ApiResponse({ status: 200, description: '패스 상태 반환' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async checkPassStatus(
    @GetUser() user: User,
    @Param('passedUserId') passedUserId: string,
  ) {
    return this.passService.checkPassStatus(user.id, parseInt(passedUserId));
  }
}

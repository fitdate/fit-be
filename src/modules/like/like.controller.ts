import { Controller, Post, Param, UseGuards, Get } from '@nestjs/common';
import { LikeService } from './like.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategy/jwt.strategy';
import { UserId } from 'src/common/decorator/get-user.decorator';

@ApiTags('like')
@ApiBearerAuth()
@Controller('like')
@UseGuards(JwtAuthGuard)
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post(':likedUserId')
  @ApiOperation({ summary: '사용자 좋아요' })
  @ApiResponse({ status: 201, description: '좋아요 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async likeUser(
    @UserId('id') userId: string,
    @Param('likedUserId') likedUserId: string,
  ): Promise<void> {
    await this.likeService.toggleLike(userId, likedUserId);
  }

  @Get(':likedUserId/status')
  @ApiOperation({ summary: '좋아요 상태 확인' })
  @ApiResponse({ status: 200, description: '좋아요 상태 반환' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async checkLikeStatus(
    @UserId('id') userId: string,
    @Param('likedUserId') likedUserId: string,
  ): Promise<boolean> {
    return this.likeService.checkLikeStatus(userId, likedUserId);
  }
}

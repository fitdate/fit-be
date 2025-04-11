import { Controller, Post, Param, UseGuards, Get } from '@nestjs/common';
import { LikeService } from './like.service';
import { User } from '../user/entities/user.entity';
import { JwtAuthGuard } from '../auth/strategy/jwt.strategy';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@Controller('likes')
@UseGuards(JwtAuthGuard)
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post(':likedUserId/toggle')
  async toggleLike(
    @GetUser() user: User,
    @Param('likedUserId') likedUserId: string,
  ) {
    return this.likeService.toggleLike(user.id, parseInt(likedUserId));
  }

  @Get(':likedUserId/status')
  async checkLikeStatus(
    @GetUser() user: User,
    @Param('likedUserId') likedUserId: string,
  ) {
    return this.likeService.checkLikeStatus(user.id, parseInt(likedUserId));
  }
}

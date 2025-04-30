import { Post, UseGuards, Req, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from 'jsonwebtoken';
import { Request, Response } from 'express';
import { TokenService } from '../services/token.service';
import { SuccessResponse } from '../interfaces/success-response.interface';
import { InternalServerErrorException } from '@nestjs/common';
import { Logger } from '@nestjs/common';

@Post('logout')
@UseGuards(JwtAuthGuard)
async logout(
  @CurrentUser() user: JwtPayload,
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
): Promise<SuccessResponse> {
  try {
    const userId = user.sub;
    
    // 토큰 무효화
    if (user.token) {
      await this.tokenService.deleteAccessToken(user.token);
    }

    // 사용자의 모든 세션 무효화
    await this.tokenService.invalidateAllSessions(userId);

    // 쿠키에서 토큰 제거
    const origin = req.headers.origin;
    const { accessOptions } = this.tokenService.getLogoutCookieOptions(origin);
    
    res.cookie('accessToken', '', accessOptions);
    
    return {
      success: true,
      message: '로그아웃 되었습니다.',
    };
  } catch (error) {
    this.logger.error(`Logout failed: ${error.message}`);
    throw new InternalServerErrorException('로그아웃 처리 중 오류가 발생했습니다.');
  }
} 
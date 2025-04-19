import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { AuthService, LoginResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { Public } from '../../common/decorator/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { SkipProfileComplete } from './guard/profile-complete.guard';
import { SendVerificationEmailDto } from './dto/send-verification-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 회원 가입
  @SkipProfileComplete()
  @Public()
  @Post('register')
  @ApiOperation({ summary: '회원 가입' })
  @ApiResponse({ status: 201, description: '회원 가입 성공' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // 이메일 인증 코드 전송
  @SkipProfileComplete()
  @Public()
  @Post('send-verification-email')
  @ApiOperation({ summary: '인증 이메일 전송' })
  @ApiResponse({ status: 200, description: '인증 이메일 전송 성공' })
  async sendVerificationEmail(
    @Body() sendVerificationEmailDto: SendVerificationEmailDto,
  ) {
    return this.authService.sendVerificationEmail(sendVerificationEmailDto);
  }

  // 이메일 인증 코드 확인
  @SkipProfileComplete()
  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: '이메일 인증 코드 확인' })
  @ApiResponse({ status: 200, description: '이메일 인증 성공' })
  @ApiResponse({ status: 401, description: '인증코드 불일치 또는 만료' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  // 이메일 로그인
  @SkipProfileComplete()
  @Public()
  @Post('login')
  @ApiOperation({ summary: '이메일 로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  async emailLogin(
    @Body() loginDto: EmailLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    return this.authService.handleEmailLogin(loginDto, req, res);
  }

  // 로그아웃
  @Post('logout')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.handleLogout(req, res);
  }

  // Google OAuth 로그인
  @SkipProfileComplete()
  @Public()
  @Get('google')
  @ApiOperation({
    summary: '구글 로그인 시작',
    description: '구글 OAuth 로그인을 시작합니다.',
  })
  @ApiResponse({
    status: 302,
    description: '구글 로그인 페이지로 리다이렉트',
  })
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  // Google OAuth 콜백
  @SkipProfileComplete()
  @Public()
  @Get('google/login/callback')
  @ApiOperation({
    summary: '구글 로그인 콜백',
  })
  @ApiResponse({
    status: 302,
    description: '프론트엔드로 리다이렉트',
  })
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const redirectUrl = await this.authService.handleGoogleCallback(
        req.user as { email: string; name?: string },
        req,
        res,
      );
      return res.redirect(redirectUrl);
    } catch (error) {
      throw new BadRequestException('구글 로그인에 실패했습니다.', {
        cause: error,
      });
    }
  }

  // Kakao OAuth 로그인
  @SkipProfileComplete()
  @Public()
  @Get('kakao')
  @ApiOperation({ summary: '카카오 로그인 시작' })
  @ApiResponse({
    status: 302,
    description: '카카오 로그인 페이지로 리다이렉트',
  })
  @UseGuards(AuthGuard('kakao'))
  kakaoAuth() {}

  // Kakao OAuth 콜백
  @SkipProfileComplete()
  @Public()
  @Get('kakao/login/callback')
  @ApiOperation({ summary: '카카오 로그인 콜백' })
  @ApiResponse({ status: 302, description: '프론트엔드로 리다이렉트' })
  @UseGuards(AuthGuard('kakao'))
  async kakaoCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const redirectUrl = await this.authService.handleKakaoCallback(
        req.user as { email: string; name?: string },
        req,
        res,
      );
      return res.redirect(redirectUrl);
    } catch (error) {
      throw new BadRequestException('카카오 로그인에 실패했습니다.', {
        cause: error,
      });
    }
  }

  // Naver OAuth 로그인
  @SkipProfileComplete()
  @Public()
  @Get('naver')
  @ApiOperation({ summary: '네이버 로그인 시작' })
  @ApiResponse({
    status: 302,
    description: '네이버 로그인 페이지로 리다이렉트',
  })
  @UseGuards(AuthGuard('naver'))
  async naverCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const redirectUrl = await this.authService.handleNaverCallback(
        req.user as { email: string; name?: string },
        req,
        res,
      );
      return res.redirect(redirectUrl);
    } catch (error) {
      throw new BadRequestException('네이버 로그인에 실패했습니다.', {
        cause: error,
      });
    }
  }
}

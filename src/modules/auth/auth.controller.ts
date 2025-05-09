import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  Delete,
  UploadedFiles,
  UseInterceptors,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { Public } from '../../common/decorator/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { SkipProfileComplete } from './guard/profile-complete.guard';
import { SendVerificationEmailDto } from './dto/send-verification-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoginResponse } from './types/auth.types';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { RequestWithUser } from './types/request.types';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MulterFile } from 'src/modules/s3/types/multer.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SocialAuthService } from './services/social-auth.service';
import { AuthProvider } from './types/oatuth.types';
import { FindPasswordDto } from './dto/find-password.dto';
import { FindEmailService } from './services/find-email.service';
import { FindAndChangePasswordDto } from './dto/find-and-change-password.dto';
import { FindAndChangePasswordService } from './services/find-and-change-password.service';
import { FindEmailDto } from './dto/find-email.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly socialAuthService: SocialAuthService,
    private readonly findEmailService: FindEmailService,
    private readonly findAndChangePasswordService: FindAndChangePasswordService,
  ) {}

  // 회원 가입
  @SkipProfileComplete()
  @Public()
  @Post('register')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
  @ApiOperation({ summary: '회원 가입' })
  @ApiResponse({ status: 201, description: '회원 가입 성공' })
  async register(
    @Body() registerDto: RegisterDto,
    @UploadedFiles() files: { images?: MulterFile[] },
  ) {
    if (files?.images) {
      registerDto.images = files.images.map((file) => file.path);
    }
    return this.authService.register(registerDto);
  }

  // 이메일 중복 확인
  @SkipProfileComplete()
  @Public()
  @Post('check-email')
  @ApiOperation({ summary: '이메일 중복 확인' })
  @ApiResponse({ status: 200, description: '이메일 중복 확인 성공' })
  async checkEmail(@Body() sendVerificationEmailDto: SendVerificationEmailDto) {
    return this.authService.checkEmail(sendVerificationEmailDto);
  }

  // 닉네임 중복 확인
  @SkipProfileComplete()
  @Public()
  @Post('check-nickname')
  @ApiOperation({ summary: '닉네임 중복 확인' })
  @ApiResponse({ status: 200, description: '닉네임 중복 확인 성공' })
  async checkNickname(@Body() nickname: string) {
    return this.authService.checkNickname(nickname);
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
  @Public()
  @Post('logout')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.handleLogout(req, res);
  }

  // 이메일 찾기
  @Public()
  @Post('find-email')
  @ApiOperation({ summary: '이메일 찾기' })
  @ApiResponse({ status: 200, description: '이메일 찾기 성공' })
  async findEmail(@Body() findEmailDto: FindEmailDto) {
    return this.findEmailService.findEmail(findEmailDto);
  }

  // 비밀번호 찾기
  @Public()
  @Post('find-password')
  @ApiOperation({ summary: '비밀번호 찾기' })
  @ApiResponse({ status: 200, description: '비밀번호 찾기 성공' })
  async findPassword(@Body() findPasswordDto: FindPasswordDto) {
    return this.findAndChangePasswordService.findPassword(findPasswordDto);
  }

  // 비밀번호 변경
  @Public()
  @Post('find-and-change-password')
  @ApiOperation({ summary: '유저 id로 비밀번호 변경' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 성공' })
  async findAndChangePassword(
    @Body() findAndChangePasswordDto: FindAndChangePasswordDto,
  ) {
    return this.findAndChangePasswordService.findAndChangePassword(
      findAndChangePasswordDto,
    );
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
    return this.handleSocialCallback(req, res, AuthProvider.GOOGLE);
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
    return this.handleSocialCallback(req, res, AuthProvider.KAKAO);
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
  naverAuth() {}

  // Naver OAuth 콜백
  @SkipProfileComplete()
  @Public()
  @Get('naver/login/callback')
  @ApiOperation({ summary: '네이버 로그인 콜백' })
  @ApiResponse({
    status: 302,
    description: '프론트엔드로 리다이렉트',
  })
  @UseGuards(AuthGuard('naver'))
  async naverCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleSocialCallback(req, res, AuthProvider.NAVER);
  }

  private async handleSocialCallback(
    req: Request,
    res: Response,
    authProvider: AuthProvider,
  ) {
    try {
      const redirectUrl = await this.socialAuthService.handleSocialCallback(
        req.user as { email: string },
        authProvider,
        req,
        res,
      );
      return res.redirect(redirectUrl);
    } catch (error) {
      throw new BadRequestException(`${authProvider} 로그인에 실패했습니다.`, {
        cause: error,
      });
    }
  }

  // 회원 탈퇴
  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiResponse({ status: 200, description: '회원 탈퇴 성공' })
  @Delete('delete-account')
  async deleteAccount(@UserId() userId: string) {
    return this.authService.deleteAccount(userId);
  }

  // 회원 복구
  @ApiOperation({ summary: '회원 복구' })
  @ApiResponse({ status: 200, description: '회원 복구 성공' })
  @Patch('restore-account')
  async restoreAccount(@UserId() userId: string) {
    return this.authService.restoreAccount(userId);
  }

  // 비밀번호 변경
  @Patch('change-password')
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 성공' })
  @ApiBody({
    type: ChangePasswordDto,
    description: '비밀번호 변경 정보',
    examples: {
      example1: {
        value: {
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        },
      },
    },
  })
  async changePassword(
    @UserId() userid: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userid,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
      changePasswordDto.confirmPassword,
    );
  }
}

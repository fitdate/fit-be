import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  Delete,
  UploadedFiles,
  UseInterceptors,
  Patch,
  Logger,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { Public } from '../../common/decorator/public.decorator';
import { Response, Request } from 'express';
import { SkipProfileComplete } from './guard/profile-complete.guard';
import { SendVerificationEmailDto } from './dto/send-verification-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { LoginResponse } from './types/auth.types';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { RequestWithUser } from './types/request.types';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MulterFile } from 'src/modules/s3/types/multer.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SocialAuthService } from './services/social-auth.service';
import { FindPasswordDto } from './dto/find-password.dto';
import { FindAndChangePasswordDto } from './dto/find-and-change-password.dto';
import { FindAndChangePasswordService } from './services/find-and-change-password.service';
import { FindEmailDto } from './dto/find-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfigService } from '@nestjs/config';
import { FindEmailService } from './services/find-email.service';
import { AuthProvider } from './types/oatuth.types';
import { SocialRegisterDto } from './dto/social-register.dto';
import { JwtService } from '@nestjs/jwt';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly socialAuthService: SocialAuthService,
    private readonly findEmailService: FindEmailService,
    private readonly findAndChangePasswordService: FindAndChangePasswordService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
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

  // 소셜 회원 가입
  @SkipProfileComplete()
  @Post('social-register')
  @ApiOperation({ summary: '소셜 회원 가입' })
  @ApiResponse({ status: 201, description: '소셜 회원 가입 성공' })
  async socialRegister(
    @UserId() userId: string,
    @Body() socialRegisterDto: SocialRegisterDto,
  ) {
    this.logger.log('=== Social Register Request ===');
    this.logger.log(`UserId from token: ${userId}`);
    this.logger.log(
      `Request Body: ${JSON.stringify(socialRegisterDto, null, 2)}`,
    );
    this.logger.log('=============================');

    return this.authService.socialRegister(userId, socialRegisterDto);
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

  // 구글 소셜 로그인 시작
  @SkipProfileComplete()
  @Public()
  @Get('google')
  @ApiOperation({ summary: '구글 소셜 로그인 시작' })
  @ApiResponse({
    status: 302,
    description: '구글 소셜 로그인 페이지로 리다이렉트',
  })
  socialLoginGoogle() {
    this.logger.log('구글 소셜 로그인 시작');
  }

  // 카카오 소셜 로그인 시작
  @SkipProfileComplete()
  @Public()
  @Get('kakao')
  @ApiOperation({ summary: '카카오 소셜 로그인 시작' })
  @ApiResponse({
    status: 302,
    description: '카카오 소셜 로그인 페이지로 리다이렉트',
  })
  socialLoginKakao() {
    this.logger.log('카카오 소셜 로그인 시작');
  }

  // 네이버 소셜 로그인 시작
  @SkipProfileComplete()
  @Public()
  @Get('naver')
  @ApiOperation({ summary: '네이버 소셜 로그인 시작' })
  @ApiResponse({
    status: 302,
    description: '네이버 소셜 로그인 페이지로 리다이렉트',
  })
  socialLoginNaver() {
    this.logger.log('네이버 소셜 로그인 시작');
  }

  // 구글 소셜 로그인 콜백 (GET)
  @SkipProfileComplete()
  @Public()
  @Get('google/callback')
  @ApiOperation({
    summary: '구글 소셜 로그인 콜백(GET, 소셜 로그인 서비스 리다이렉트)',
  })
  @ApiResponse({ status: 200, description: '구글 소셜 로그인 성공' })
  async googleCallbackGet(
    @Query('code') code: string,
    @Query('redirectUri') redirectUri: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log('구글 소셜 로그인 GET 콜백 처리 시작');
    return this.socialAuthService.handleSocialCallbackPost(
      { code, provider: AuthProvider.GOOGLE, redirectUri },
      req,
      res,
    );
  }

  // 구글 소셜 로그인 콜백 (POST)
  @SkipProfileComplete()
  @Public()
  @Post('google/callback')
  @ApiOperation({ summary: '구글 소셜 로그인 콜백(POST, 프론트엔드 콜백 URL)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '실제 소셜 인증 후 받은 code' },
        redirectUri: {
          type: 'string',
          example: 'https://your-frontend.com/social/callback',
        },
      },
      required: ['code', 'redirectUri'],
    },
    description:
      'code는 소셜 인증 후 프론트엔드 콜백 URL에서 추출하여 입력하세요.',
  })
  @ApiResponse({ status: 200, description: '구글 소셜 로그인 성공' })
  async googleCallbackPost(
    @Body('code') code: string,
    @Body('redirectUri') redirectUri: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log('구글 소셜 로그인 POST 콜백 처리 시작');
    return this.socialAuthService.handleSocialCallbackPost(
      { code, provider: AuthProvider.GOOGLE, redirectUri },
      req,
      res,
    );
  }

  // 카카오 소셜 로그인 콜백
  @SkipProfileComplete()
  @Public()
  @Post('kakao/callback')
  @ApiOperation({
    summary: '카카오 소셜 로그인 콜백(POST, 프론트엔드 콜백 URL)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '실제 소셜 인증 후 받은 code' },
        redirectUri: {
          type: 'string',
          example: 'https://your-frontend.com/social/callback',
        },
      },
      required: ['code', 'redirectUri'],
    },
    description:
      'code는 소셜 인증 후 프론트엔드 콜백 URL에서 추출하여 입력하세요.',
  })
  @ApiResponse({ status: 200, description: '카카오 소셜 로그인 성공' })
  async kakaoCallbackPost(
    @Body('code') code: string,
    @Body('redirectUri') redirectUri: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log('카카오 소셜 로그인 POST 콜백 처리 시작');
    return this.socialAuthService.handleSocialCallbackPost(
      { code, provider: AuthProvider.KAKAO, redirectUri },
      req,
      res,
    );
  }

  // 카카오 소셜 로그인 콜백 (GET)
  @SkipProfileComplete()
  @Public()
  @Get('kakao/callback')
  @ApiOperation({
    summary: '카카오 소셜 로그인 콜백(POST, 프론트엔드 콜백 URL)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '실제 소셜 인증 후 받은 code' },
        redirectUri: {
          type: 'string',
          example: 'https://your-frontend.com/social/callback',
        },
      },
      required: ['code', 'redirectUri'],
    },
    description:
      'code는 소셜 인증 후 프론트엔드 콜백 URL에서 추출하여 입력하세요.',
  })
  @ApiResponse({ status: 200, description: '카카오 소셜 로그인 성공' })
  async kakaoCallbackGet(
    @Query('code') code: string,
    @Query('redirectUri') redirectUri: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log('카카오 소셜 로그인 GET 콜백 처리 시작');
    return this.socialAuthService.handleSocialCallbackPost(
      { code, provider: AuthProvider.KAKAO, redirectUri },
      req,
      res,
    );
  }

  // 네이버 소셜 로그인 콜백 (POST)
  @SkipProfileComplete()
  @Public()
  @Post('naver/callback')
  @ApiOperation({
    summary: '네이버 소셜 로그인 콜백(POST, 프론트엔드 콜백 URL)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '실제 소셜 인증 후 받은 code' },
        state: { type: 'string', example: '실제 소셜 인증 후 받은 state' },
        redirectUri: {
          type: 'string',
          example: 'https://your-frontend.com/social/callback',
        },
      },
      required: ['code', 'state', 'redirectUri'],
    },
  })
  @ApiResponse({ status: 200, description: '네이버 소셜 로그인 성공' })
  async naverCallbackPost(
    @Body('code') code: string,
    @Body('redirectUri') redirectUri: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log('네이버 소셜 로그인 POST 콜백 처리 시작');
    return this.socialAuthService.handleSocialCallbackPost(
      { code, provider: AuthProvider.NAVER, redirectUri },
      req,
      res,
    );
  }

  // 네이버 소셜 로그인 콜백 (POST)
  @SkipProfileComplete()
  @Public()
  @Get('naver/callback')
  @ApiOperation({
    summary: '네이버 소셜 로그인 콜백(GET, 프론트엔드 콜백 URL)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '실제 소셜 인증 후 받은 code' },
        state: { type: 'string', example: '실제 소셜 인증 후 받은 state' },
        redirectUri: {
          type: 'string',
          example: 'https://your-frontend.com/social/callback',
        },
      },
      required: ['code', 'state', 'redirectUri'],
    },
  })
  @ApiResponse({ status: 200, description: '네이버 소셜 로그인 성공' })
  async naverCallbackGet(
    @Query('code') code: string,
    @Query('redirectUri') redirectUri: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log('네이버 소셜 로그인 POST 콜백 처리 시작');
    return this.socialAuthService.handleSocialCallbackPost(
      { code, provider: AuthProvider.NAVER, redirectUri },
      req,
      res,
    );
  }

  // 회원 탈퇴
  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiResponse({ status: 200, description: '회원 탈퇴 성공' })
  @Delete('delete-account')
  async deleteAccount(
    @UserId() userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.deleteAccount(userId, res);
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

  // 토큰 재발급
  @Post('refresh-token')
  @ApiOperation({ summary: '토큰 재발급' })
  @ApiResponse({ status: 200, description: '토큰 재발급 성공' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshToken(refreshTokenDto);
  }

  // 소셜 로그인 유저 상태 확인
  @SkipProfileComplete()
  @Public()
  @Get('social/status')
  @ApiOperation({ summary: '소셜 로그인 유저 상태 확인' })
  @ApiQuery({ name: 'email', required: true, description: '유저 이메일' })
  @ApiQuery({
    name: 'provider',
    required: true,
    description: '소셜 로그인 제공자 (google/kakao/naver)',
  })
  @ApiResponse({
    status: 200,
    description: '유저 상태 확인 성공',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean', description: '유저 존재 여부' },
        isProfileComplete: { type: 'boolean', description: '프로필 완성 여부' },
        userId: { type: 'string', description: '유저 ID (존재하는 경우)' },
        authProvider: { type: 'string', description: '인증 제공자' },
      },
    },
  })
  async checkSocialUserStatus(
    @Query('email') email: string,
    @Query('provider') provider: string,
  ) {
    this.logger.log(`소셜 유저 상태 확인: ${email}, provider: ${provider}`);
    return this.socialAuthService.checkSocialUserStatus(
      email,
      provider as AuthProvider,
    );
  }
}

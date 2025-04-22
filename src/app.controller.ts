import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorator/public.decorator';
import { SkipProfileComplete } from './modules/auth/guard/profile-complete.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @SkipProfileComplete()
  @Public()
  @ApiOperation({
    summary: '서버 상태 확인',
    description: '서버의 현재 상태와 타임스탬프를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '서버가 정상적으로 동작 중입니다.' })
  @Get('health')
  getHello(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

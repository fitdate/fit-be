import { Controller, Post } from '@nestjs/common';
import { SeedManagerService } from './seed-manager.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RBAC } from 'src/common/decorator/rbac.decorator';
import { UserRole } from 'src/common/enum/user-role.enum';
import { Public } from 'src/common/decorator/public.decorator';
@ApiTags('Seed Manager')
@Controller('seed-manager')
export class SeedManagerController {
  constructor(private readonly seedManagerService: SeedManagerService) {}

  @Post('insert')
  @Public()
  // @RBAC(UserRole.ADMIN)
  @ApiOperation({ summary: '삽입' })
  @ApiResponse({ status: 200, description: '삽입 성공' })
  @ApiResponse({ status: 400, description: '삽입 실패' })
  async initialize() {
    return this.seedManagerService.seedInitialize();
  }

  @Post('extract')
  // @RBAC(UserRole.ADMIN)
  @Public()
  @ApiOperation({ summary: '추출' })
  @ApiResponse({ status: 200, description: '추출 성공' })
  @ApiResponse({ status: 400, description: '추출 실패' })
  async extract() {
    return this.seedManagerService.extractDataFromDb();
  }
}

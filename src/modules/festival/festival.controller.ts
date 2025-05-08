import { Controller, Get } from '@nestjs/common';
import { FestivalService } from './festival.service';
import { FestivalDto } from './dto/festival.dto';
import { ApiOperation } from '@nestjs/swagger';
import { UserRequestFestivalService } from './service/user-request-festival.service';
import { UserId } from 'src/common/decorator/get-user.decorator';
@Controller('festival')
export class FestivalController {
  constructor(
    private readonly festivalService: FestivalService,
    private readonly userRequestFestivalService: UserRequestFestivalService,
  ) {}

  @ApiOperation({ summary: '전체 축제 조회' })
  @Get()
  getFestivals(): Promise<Record<string, FestivalDto[]>> {
    return this.festivalService.getFestivals();
  }

  @ApiOperation({ summary: '사용자 지역 축제 조회' })
  @Get('user-request/:userId')
  getFestivalByUserArea(@UserId() userId: string): Promise<FestivalDto[]> {
    return this.userRequestFestivalService.getFestivalByUserArea(userId);
  }
}

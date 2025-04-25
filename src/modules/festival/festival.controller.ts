import { Controller, Get, Query } from '@nestjs/common';
import { FestivalService } from './festival.service';
import { FestivalDto } from './dto/festival.dto';

@Controller('festival')
export class FestivalController {
  constructor(private readonly festivalService: FestivalService) {}

  @Get()
  getFestivalByRegion(@Query('region') region: number): Promise<FestivalDto[]> {
    return this.festivalService.getFestivalByRegion(region);
  }
}

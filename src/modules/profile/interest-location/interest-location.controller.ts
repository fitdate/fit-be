import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { InterestLocationService } from './interest-location.service';
import { CreateInterestLocationDto } from './dto/create-many-interest-location.dto';
import { UpdateInterestLocationDto } from './dto/update-interest-location.dto';

@Controller('interest-location')
export class InterestLocationController {
  constructor(
    private readonly interestLocationService: InterestLocationService,
  ) {}

  @Post()
  create(@Body() createInterestLocationDto: CreateInterestLocationDto) {
    return this.interestLocationService.create(createInterestLocationDto);
  }

  @Get()
  findAll() {
    return this.interestLocationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.interestLocationService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInterestLocationDto: UpdateInterestLocationDto,
  ) {
    return this.interestLocationService.update(+id, updateInterestLocationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.interestLocationService.remove(+id);
  }
}

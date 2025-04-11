import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MbtiService } from './mbti.service';
import { CreateMbtiDto } from './dto/create-mbti.dto';
import { UpdateMbtiDto } from './dto/update-mbti.dto';

@Controller('mbti')
export class MbtiController {
  constructor(private readonly mbtiService: MbtiService) {}

  @Post()
  create(@Body() createMbtiDto: CreateMbtiDto) {
    return this.mbtiService.create(createMbtiDto);
  }

  @Get()
  findAll() {
    return this.mbtiService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mbtiService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMbtiDto: UpdateMbtiDto) {
    return this.mbtiService.update(+id, updateMbtiDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mbtiService.remove(+id);
  }
}

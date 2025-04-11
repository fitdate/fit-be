import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
import { CreateProfileImageDto } from './dto/create-profile-image.dto';
import { UpdateProfileImageDto } from './dto/update-profile-image.dto';

@Controller('profile-image')
export class ProfileImageController {
  constructor(private readonly profileImageService: ProfileImageService) {}

  @Post()
  create(@Body() createProfileImageDto: CreateProfileImageDto) {
    return this.profileImageService.create(createProfileImageDto);
  }

  @Get()
  findAll() {
    return this.profileImageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profileImageService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfileImageDto: UpdateProfileImageDto) {
    return this.profileImageService.update(+id, updateProfileImageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.profileImageService.remove(+id);
  }
}

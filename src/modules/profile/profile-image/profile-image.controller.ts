import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Put,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
import { CreateProfileImageDto } from './dto/create-profile-image.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterFile } from './types/multer.types';
import { UpdateProfileImageDto } from './dto/update-profile-image.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Profile Image')
@Controller('profile-image')
export class ProfileImageController {
  constructor(private readonly profileImageService: ProfileImageService) {}

  @Post()
  @ApiOperation({ summary: 'Upload profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        profileId: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Profile image uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(
    @UploadedFile() file: MulterFile,
    @Body() createProfileImageDto: CreateProfileImageDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file was uploaded');
    }

    return this.profileImageService.uploadProfileImages(
      createProfileImageDto.profileId,
      file,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        oldImageName: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile image updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseInterceptors(FileInterceptor('file'))
  async updateProfileImage(
    @Param('id') id: string,
    @Body() updateProfileImageDto: UpdateProfileImageDto,
    @UploadedFile() file: MulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('No file was uploaded');
    }

    const oldImageName = updateProfileImageDto.oldImageNames?.[0] || null;

    return this.profileImageService.updateProfileImage(
      id,
      file,
      oldImageName,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete profile image' })
  @ApiResponse({
    status: 200,
    description: 'Profile image deleted successfully',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteProfileImage(
    @Param('id') id: string,
    @Query('imageName') imageName?: string,
  ) {
    return this.profileImageService.deleteProfileImage(id, imageName);
  }
}

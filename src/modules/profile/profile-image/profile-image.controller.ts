import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
import { CreateProfileImageDto } from './dto/create-profile-image.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProfileImageFilePipe } from './pipe/profile-image.pipe';
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
  @ApiOperation({ summary: 'Upload profile images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        profileImageName: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Profile images uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseInterceptors(FilesInterceptor('images', 5))
  uploadProfileImages(
    @UploadedFiles(
      new ProfileImageFilePipe({
        maxSize: 5,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
        resize: { width: 1024, height: 1024 },
        quality: 100,
      }),
    )
    files: Array<MulterFile>,
    @Body() createProfileImageDto: CreateProfileImageDto,
  ) {
    return this.profileImageService.createProfileImages(createProfileImageDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        profileImageName: {
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
  @UseInterceptors(FilesInterceptor('images', 1))
  updateProfileImage(
    @Param('id') id: string,
    @Body() updateProfileImageDto: UpdateProfileImageDto,
    @UploadedFiles(
      new ProfileImageFilePipe({
        maxSize: 5,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
        resize: { width: 1024, height: 1024 },
        quality: 100,
      }),
    )
    files: Array<MulterFile>,
  ) {
    return this.profileImageService.updateProfileImage(
      id,
      updateProfileImageDto.profileImageName ?? '',
      files[0].filename,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete profile image' })
  @ApiResponse({
    status: 200,
    description: 'Profile image deleted successfully',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  deleteProfileImage(@Param('id') id: string) {
    return this.profileImageService.deleteProfileImage(id);
  }
}

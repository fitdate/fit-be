import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  Put,
  Param,
  Delete,
  Query,
  BadRequestException,
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
        profileId: {
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
  @UseInterceptors(FilesInterceptor('images', 6))
  async uploadProfileImages(
    @UploadedFiles(
      new ProfileImageFilePipe({
        maxSize: 5,
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/jpg',
        ],
        resize: { width: 1024, height: 1024 },
        quality: 100,
      }),
    )
    files: Array<MulterFile>,
    @Body() createProfileImageDto: CreateProfileImageDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files were uploaded');
    }

    const uploadPromises = files.map((file) => {
      if (!file.filename) {
        throw new BadRequestException('File name is missing');
      }
      return this.profileImageService.uploadProfileImages(
        createProfileImageDto.profileId,
        file,
      );
    });

    return Promise.all(uploadPromises);
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
        oldImageNames: {
          type: 'array',
          items: {
            type: 'string',
          },
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
  @UseInterceptors(FilesInterceptor('images', 6))
  async updateProfileImage(
    @Param('id') id: string,
    @Body() updateProfileImageDto: UpdateProfileImageDto,
    @UploadedFiles(
      new ProfileImageFilePipe({
        maxSize: 5,
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/jpg',
        ],
        resize: { width: 1024, height: 1024 },
        quality: 100,
      }),
    )
    files: Array<MulterFile>,
  ) {
    const updatePromises = files.map((file, index) => {
      const oldImageName = updateProfileImageDto.oldImageNames?.[index] || null;
      return this.profileImageService.updateProfileImage(
        id,
        file.filename,
        oldImageName,
      );
    });

    return Promise.all(updatePromises);
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

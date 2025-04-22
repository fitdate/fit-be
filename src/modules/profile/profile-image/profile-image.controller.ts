import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  Put,
  Param,
  Delete,
  BadRequestException,
  Patch,
  Get,
} from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
import { CreateProfileImageDto } from './dto/create-profile-image.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MulterFile } from './types/multer.types';
import { UpdateProfileImageDto } from './dto/update-profile-image.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { DeleteProfileImageDto } from './dto/delete-profile-image.dto';

@ApiTags('Profile Image')
@Controller('profile-image')
export class ProfileImageController {
  constructor(private readonly profileImageService: ProfileImageService) {}

  @Post()
  @ApiOperation({ summary: '프로필 이미지 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '프로필 이미지 업로드 성공',
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  @UseInterceptors(FilesInterceptor('files', 6)) // 최대 6개의 파일 업로드 가능
  async uploadProfileImages(
    @UploadedFiles() files: MulterFile[],
    @Body() createProfileImageDto: CreateProfileImageDto,
    @UserId() userId: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('업로드된 파일이 없습니다.');
    }

    return this.profileImageService.uploadProfileImages(userId, files);
  }

  @Put(':profileId')
  @ApiOperation({ summary: 'Update multiple profile images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        oldImageIds: {
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
    description: '프로필 이미지 업데이트 성공',
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  @UseInterceptors(FilesInterceptor('files', 6))
  async updateProfileImages(
    @Param('profileId') profileId: string,
    @Body() updateProfileImageDto: UpdateProfileImageDto,
    @UploadedFiles() files: MulterFile[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('업로드된 파일이 없습니다.');
    }

    return this.profileImageService.updateProfileImages(
      profileId,
      files,
      updateProfileImageDto.oldImageIds || [],
    );
  }

  @Delete('batch')
  @ApiOperation({ summary: 'Delete multiple profile images' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
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
    description: '프로필 이미지 삭제 성공',
  })
  @ApiResponse({ status: 500, description: '서버 오류' })
  async deleteProfileImages(
    @Body() deleteProfileImageDto: DeleteProfileImageDto,
  ) {
    if (!deleteProfileImageDto.ids || deleteProfileImageDto.ids.length === 0) {
      throw new BadRequestException('이미지 ID가 제공되지 않았습니다.');
    }

    return this.profileImageService.deleteProfileImages(
      deleteProfileImageDto.ids,
    );
  }

  @Patch('set-main-image')
  @ApiOperation({ summary: '메인 이미지 설정' })
  @ApiResponse({ status: 200, description: '메인 이미지가 설정되었습니다.' })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  async setMainImage(@UserId() userId: string, @Param('id') imageId: string) {
    return this.profileImageService.setMainImage(userId, imageId);
  }

  @Get()
  @ApiOperation({ summary: 'Get profile images' })
  @ApiResponse({
    status: 200,
    description: '프로필 이미지 조회 성공',
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  async getProfileImages(@UserId() userId: string) {
    return this.profileImageService.getProfileImages(userId);
  }
}

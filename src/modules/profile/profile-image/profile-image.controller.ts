import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  Put,
  Param,
  Delete,
  Patch,
  Get,
} from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
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
import { Public } from 'src/common/decorator/public.decorator';
@ApiTags('Profile Image')
@Controller('profile-image')
export class ProfileImageController {
  constructor(private readonly profileImageService: ProfileImageService) {}

  @Public()
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
  uploadProfileImages(
    @UploadedFiles() files: MulterFile[],
    @UserId() userId: string,
  ) {
    return this.profileImageService.uploadProfileImages(userId, files);
  }

  @Put(':profileId')
  @ApiOperation({ summary: '프로필 이미지 일괄 업데이트' })
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
  updateProfileImages(
    @Param('profileId') profileId: string,
    @Body() updateProfileImageDto: UpdateProfileImageDto,
    @UploadedFiles() files: MulterFile[],
  ) {
    return this.profileImageService.updateProfileImages(
      profileId,
      files,
      updateProfileImageDto.oldImageIds,
    );
  }

  @Delete('batch')
  @ApiOperation({ summary: '프로필 이미지 일괄 삭제' })
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
  deleteProfileImages(@Body() deleteProfileImageDto: DeleteProfileImageDto) {
    return this.profileImageService.deleteProfileImages(
      deleteProfileImageDto.ids,
    );
  }

  @Patch('set-main-image')
  @ApiOperation({ summary: '메인 이미지 설정' })
  @ApiResponse({ status: 200, description: '메인 이미지가 설정되었습니다.' })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  setMainImage(@UserId() userId: string, @Param('id') imageId: string) {
    return this.profileImageService.setMainImage(userId, imageId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: '프로필 이미지 조회' })
  @ApiResponse({
    status: 200,
    description: '프로필 이미지 조회 성공',
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  getProfileImages(@UserId() userId: string) {
    return this.profileImageService.getProfileImages(userId);
  }
}

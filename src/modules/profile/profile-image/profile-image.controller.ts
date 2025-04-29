import {
  Controller,
  Post,
  Body,
  Param,
  Patch,
  Get,
  UploadedFile,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { Public } from 'src/common/decorator/public.decorator';
import { MulterFile } from 'src/modules/s3/types/multer.types';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileImageFilePipe } from './pipe/profile-image.pipe';

@ApiTags('Profile Image')
@Controller('profile-image')
export class ProfileImageController {
  constructor(private readonly profileImageService: ProfileImageService) {}

  @Public()
  @Post('temp')
  @ApiOperation({ summary: '임시 폴더에 이미지 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '업로드할 이미지 파일',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(
    @UploadedFile(
      new ProfileImageFilePipe({
        maxSize: 5, // 5MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/gif',
        ],
        resize: {
          width: 800,
          height: 800,
        },
        quality: 90,
      }),
    )
    file: MulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('업로드할 파일이 없습니다');
    }
    return this.profileImageService.uploadTempImage(file);
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

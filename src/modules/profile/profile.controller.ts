import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateUserMbtiDto } from './mbti/dto/create-mbti.dto';
import { CreateUserIntroductionDto } from './introduction/dto/create-user-introduction.dto';
import { CreateUserFeedbackDto } from './feedback/dto/create-user-feedback.dto';
import { CreateUserInterestCategoryDto } from './interest-category/dto/create-user-interest-category.dto';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { SkipProfileComplete } from '../auth/guard/profile-complete.guard';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @SkipProfileComplete()
  @Post()
  @ApiOperation({ summary: '프로필 생성' })
  @ApiBody({
    schema: {
      example: {
        createProfileDto: {
          intro: '안녕하세요',
          job: '개발자',
        },
        createUserMbtiDto: {
          mbti: 'ENTP',
        },
        createUserFeedbackDto: {
          feedbackIds: ['uuid1', 'uuid2'],
        },
        createUserIntroductionDto: {
          introductionIds: ['uuid1', 'uuid2'],
        },
        createUserInterestCategoryDto: {
          interestCategoryIds: ['uuid1', 'uuid2'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: '프로필 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async create(
    @UserId() userId: string,
    @Body()
    dto: {
      createProfileDto: Omit<CreateProfileDto, 'userId'>;
      createUserMbtiDto: CreateUserMbtiDto;
      createUserFeedbackDto: CreateUserFeedbackDto;
      createUserIntroductionDto: CreateUserIntroductionDto;
      createUserInterestCategoryDto: CreateUserInterestCategoryDto;
    },
  ) {
    return this.profileService.createFullProfile(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  @ApiResponse({ status: 404, description: '프로필을 찾을 수 없음' })
  async getMyProfile(@UserId() userId: string) {
    return this.profileService.getProfileByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '프로필 ID로 조회' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  @ApiResponse({ status: 404, description: '프로필을 찾을 수 없음' })
  async getProfileById(@Param('id') id: string) {
    return this.profileService.getProfileById(id);
  }

  @SkipProfileComplete()
  @Patch()
  @ApiOperation({ summary: '프로필 수정' })
  @ApiBody({
    schema: {
      example: {
        updateProfileDto: {
          intro: '수정된 자기소개',
          job: '수정된 직업',
        },
        updateUserMbtiDto: {
          mbti: 'INTJ',
        },
        updateUserFeedbackDto: {
          feedbackIds: ['uuid3', 'uuid4'],
        },
        updateUserIntroductionDto: {
          introductionIds: ['uuid3', 'uuid4'],
        },
        updateUserInterestCategoryDto: {
          interestCategoryIds: ['uuid3', 'uuid4'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: '프로필 수정 성공' })
  @ApiResponse({ status: 404, description: '프로필을 찾을 수 없음' })
  async updateMyProfile(
    @UserId() userId: string,
    @Body()
    dto: {
      updateProfileDto: UpdateProfileDto;
      updateUserMbtiDto?: CreateUserMbtiDto;
      updateUserFeedbackDto?: CreateUserFeedbackDto;
      updateUserIntroductionDto?: CreateUserIntroductionDto;
      updateUserInterestCategoryDto?: CreateUserInterestCategoryDto;
    },
  ) {
    return this.profileService.updateFullProfile(userId, dto);
  }
}

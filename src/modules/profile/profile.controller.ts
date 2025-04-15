import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateUserMbtiDto } from './mbti/dto/create-mbti.dto';
import { CreateUserIntroductionDto } from './introduction/dto/create-user-introduction.dto';
import { CreateUserFeedbackDto } from './feedback/dto/create-user-feedback.dto';
import { CreateUserInterestCategoryDto } from './interest-category/dto/create-user-interest-category.dto';
import { MbtiService } from './mbti/mbti.service';
import { UserFeedbackService } from './feedback/user/user-feedback.service';
import { UserIntroductionService } from './introduction/user/user-introduction.service';
import { UserInterestCategoryService } from './interest-category/user/user-interest-category.service';
import { UserId } from 'src/common/decorator/get-user.decorator';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly mbtiService: MbtiService,
    private readonly feedbackService: UserFeedbackService,
    private readonly introductionService: UserIntroductionService,
    private readonly interestCategoryService: UserInterestCategoryService,
  ) {}

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
    @UserId() userId: number,
    @Body()
    dto: {
      createProfileDto: Omit<CreateProfileDto, 'userId'>;
      createUserMbtiDto: CreateUserMbtiDto;
      createUserFeedbackDto: CreateUserFeedbackDto;
      createUserIntroductionDto: CreateUserIntroductionDto;
      createUserInterestCategoryDto: CreateUserInterestCategoryDto;
    },
  ) {
    const profile = await this.profileService.create({
      createProfileDto: {
        ...dto.createProfileDto,
        userId: userId.toString(),
      },
    });
    await this.mbtiService.createUserMbti(profile.id, dto.createUserMbtiDto);
    await this.feedbackService.createUserFeedback({
      ...dto.createUserFeedbackDto,
      profileId: profile.id,
    });
    await this.introductionService.createUserIntroduction({
      ...dto.createUserIntroductionDto,
      profileId: profile.id,
    });
    await this.interestCategoryService.createUserInterestCategory({
      ...dto.createUserInterestCategoryDto,
      profileId: profile.id,
    });
    return this.profileService.getProfileById(profile.id);
  }

  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  @ApiResponse({ status: 404, description: '프로필을 찾을 수 없음' })
  async getMyProfile(@UserId() userId: number) {
    return this.profileService.getProfileByUserId(userId.toString());
  }

  @Get(':id')
  @ApiOperation({ summary: '프로필 ID로 조회' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  @ApiResponse({ status: 404, description: '프로필을 찾을 수 없음' })
  async getProfileById(@Param('id') id: string) {
    return this.profileService.getProfileById(id);
  }

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
    @UserId() userId: number,
    @Body()
    dto: {
      updateProfileDto: UpdateProfileDto;
      updateUserMbtiDto?: CreateUserMbtiDto;
      updateUserFeedbackDto?: CreateUserFeedbackDto;
      updateUserIntroductionDto?: CreateUserIntroductionDto;
      updateUserInterestCategoryDto?: CreateUserInterestCategoryDto;
    },
  ) {
    const profile = await this.profileService.getProfileByUserId(
      userId.toString(),
    );

    await this.profileService.update(profile.id, dto.updateProfileDto);

    if (dto.updateUserMbtiDto) {
      await this.mbtiService.createUserMbti(profile.id, dto.updateUserMbtiDto);
    }

    if (dto.updateUserFeedbackDto) {
      await this.feedbackService.updateUserFeedback({
        ...dto.updateUserFeedbackDto,
        profileId: profile.id,
      });
    }

    if (dto.updateUserIntroductionDto) {
      await this.introductionService.updateUserIntroduction({
        ...dto.updateUserIntroductionDto,
        profileId: profile.id,
      });
    }

    if (dto.updateUserInterestCategoryDto) {
      await this.interestCategoryService.updateUserInterestCategory({
        ...dto.updateUserInterestCategoryDto,
        profileId: profile.id,
      });
    }

    return this.profileService.getProfileById(profile.id);
  }
}

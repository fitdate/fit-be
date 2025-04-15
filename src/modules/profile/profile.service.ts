import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MbtiService } from './mbti/mbti.service';
import { UserFeedbackService } from './feedback/user/user-feedback.service';
import { UserIntroductionService } from './introduction/user/user-introduction.service';
import { UserInterestCategoryService } from './interest-category/user/user-interest-category.service';
import { CreateUserMbtiDto } from './mbti/dto/create-mbti.dto';
import { CreateUserFeedbackDto } from './feedback/dto/create-user-feedback.dto';
import { CreateUserIntroductionDto } from './introduction/dto/create-user-introduction.dto';
import { CreateUserInterestCategoryDto } from './interest-category/dto/create-user-interest-category.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private readonly mbtiService: MbtiService,
    private readonly feedbackService: UserFeedbackService,
    private readonly introductionService: UserIntroductionService,
    private readonly interestCategoryService: UserInterestCategoryService,
  ) {}

  async create(dto: { createProfileDto: CreateProfileDto }) {
    const existingProfile = await this.profileRepository.findOne({
      where: { user: { id: dto.createProfileDto.userId } },
    });

    if (existingProfile) {
      throw new ConflictException('Profile already exists for this user');
    }

    const profile = this.profileRepository.create({
      intro: dto.createProfileDto.intro,
      job: dto.createProfileDto.job,
      user: { id: dto.createProfileDto.userId },
    });

    await this.profileRepository.save(profile);

    return profile;
  }

  async update(id: string, dto: UpdateProfileDto) {
    const profile = await this.getProfileById(id);
    return this.profileRepository.save({ ...profile, ...dto });
  }

  async getProfileById(id: string) {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: [
        'user',
        'mbti',
        'userFeedbacks',
        'userIntroductions',
        'interestCategory',
      ],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return profile;
  }

  async getProfileByUserId(userId: string) {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: [
        'user',
        'mbti',
        'userFeedbacks',
        'userIntroductions',
        'interestCategory',
      ],
    });

    if (!profile) {
      throw new NotFoundException(`Profile for user ID ${userId} not found`);
    }

    return profile;
  }

  async createFullProfile(
    userId: string,
    dto: {
      createProfileDto: Omit<CreateProfileDto, 'userId'>;
      createUserMbtiDto: CreateUserMbtiDto;
      createUserFeedbackDto: CreateUserFeedbackDto;
      createUserIntroductionDto: CreateUserIntroductionDto;
      createUserInterestCategoryDto: CreateUserInterestCategoryDto;
    },
  ) {
    const profile = await this.create({
      createProfileDto: {
        ...dto.createProfileDto,
        userId: userId,
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

    return this.getProfileById(profile.id);
  }

  async updateFullProfile(
    userId: string,
    dto: {
      updateProfileDto: UpdateProfileDto;
      updateUserMbtiDto?: CreateUserMbtiDto;
      updateUserFeedbackDto?: CreateUserFeedbackDto;
      updateUserIntroductionDto?: CreateUserIntroductionDto;
      updateUserInterestCategoryDto?: CreateUserInterestCategoryDto;
    },
  ) {
    const profile = await this.getProfileByUserId(userId);

    await this.update(profile.id, dto.updateProfileDto);

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

    return this.getProfileById(profile.id);
  }
}

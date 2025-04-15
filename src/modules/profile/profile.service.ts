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
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
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
}

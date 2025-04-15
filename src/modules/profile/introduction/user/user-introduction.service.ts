import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserIntroduction } from '../entities/user-introduction.entity';
import { CreateUserIntroductionDto } from '../dto/create-user-introduction.dto';

@Injectable()
export class UserIntroductionService {
  constructor(
    @InjectRepository(UserIntroduction)
    private readonly userIntroductionRepository: Repository<UserIntroduction>,
  ) {}

  async createUserIntroduction(
    dto: CreateUserIntroductionDto,
  ): Promise<UserIntroduction[]> {
    const userIntroductions = dto.introductionIds.map((introductionId) =>
      this.userIntroductionRepository.create({
        introduction: { id: introductionId },
        profile: { id: dto.profileId },
      }),
    );

    return this.userIntroductionRepository.save(userIntroductions);
  }

  async updateUserIntroduction(
    dto: CreateUserIntroductionDto,
  ): Promise<UserIntroduction[]> {
    const existingUserIntroductions =
      await this.userIntroductionRepository.find({
        where: { profile: { id: dto.profileId } },
        relations: ['introduction'],
      });

    const existingIntroductionIds = existingUserIntroductions.map(
      (userIntroduction) => userIntroduction.introduction.id,
    );

    const introductionsToRemove = existingUserIntroductions.filter(
      (userIntroduction) =>
        !dto.introductionIds.includes(userIntroduction.introduction.id),
    );

    if (introductionsToRemove.length > 0) {
      await this.userIntroductionRepository.remove(introductionsToRemove);
    }

    const introductionsToAdd = dto.introductionIds.filter(
      (id) => !existingIntroductionIds.includes(id),
    );

    if (introductionsToAdd.length > 0) {
      const newIntroductions = introductionsToAdd.map((introductionId) =>
        this.userIntroductionRepository.create({
          introduction: { id: introductionId },
          profile: { id: dto.profileId },
        }),
      );

      await this.userIntroductionRepository.save(newIntroductions);
    }

    return this.userIntroductionRepository.find({
      where: { profile: { id: dto.profileId } },
      relations: ['introduction'],
      order: { id: 'ASC' },
    });
  }
}

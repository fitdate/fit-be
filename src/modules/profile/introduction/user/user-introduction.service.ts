import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserIntroduction } from '../entities/user-introduction.entity';
import { CreateUserIntroductionDto } from '../dto/create-user-introduction.dto';
import { IntroductionService } from '../common/introduction.service';
@Injectable()
export class UserIntroductionService {
  constructor(
    @InjectRepository(UserIntroduction)
    private readonly userIntroductionRepository: Repository<UserIntroduction>,
    private readonly introductionService: IntroductionService,
  ) {}

  // 사용자 소개 생성
  async createUserIntroduction(
    dto: CreateUserIntroductionDto,
  ): Promise<UserIntroduction[]> {
    const userIntroductions: UserIntroduction[] = [];

    for (const name of dto.introductionNames) {
      let introduction = (
        await this.introductionService.searchIntroductions(name)
      )[0];
      if (!introduction) {
        introduction = await this.introductionService.createIntroduction({
          name,
        });
      }
      const userIntroduction = this.userIntroductionRepository.create({
        introduction: { id: introduction.id },
        profile: { id: dto.profileId },
      });

      userIntroductions.push(userIntroduction);
    }

    return this.userIntroductionRepository.save(userIntroductions);
  }

  // 사용자 소개 업데이트
  async updateUserIntroduction(
    dto: CreateUserIntroductionDto,
  ): Promise<UserIntroduction[]> {
    const introductions = await this.introductionService.findAllIntroduction();

    const foundNames = introductions.map((introduction) => introduction.name);
    const missingNames = dto.introductionNames.filter(
      (name) => !foundNames.includes(name),
    );

    if (missingNames.length > 0) {
      throw new NotFoundException(
        `The following introductions do not exist: ${missingNames.join(', ')}`,
      );
    }

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
        !dto.introductionIds.some(
          (id) => id === userIntroduction.introduction.id,
        ),
    );

    if (introductionsToRemove.length > 0) {
      await this.userIntroductionRepository.remove(introductionsToRemove);
    }

    const introductionsToAdd = dto.introductionIds.filter(
      (id) => !existingIntroductionIds.includes(id),
    );

    if (introductionsToAdd.length > 0) {
      const newIntroductions = introductionsToAdd.map((id) =>
        this.userIntroductionRepository.create({
          introduction: { id },
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

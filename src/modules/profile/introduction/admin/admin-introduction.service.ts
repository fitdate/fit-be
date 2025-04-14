import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Introduction } from '../entities/introduction.entity';
import { CreateIntroductionDto } from '../dto/create-introduction.dto';
import { UpdateIntroductionDto } from '../dto/update-introduction.dto';
import { IntroductionResponseDto } from '../dto/introduction-response.dto';

@Injectable()
export class AdminIntroductionService {
  constructor(
    @InjectRepository(Introduction)
    private readonly introductionRepository: Repository<Introduction>,
  ) {}

  async createIntroduction(
    createIntroductionDto: CreateIntroductionDto,
  ): Promise<IntroductionResponseDto> {
    const existing = await this.introductionRepository.findOne({
      where: { name: createIntroductionDto.name },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 소개입니다.');
    }

    const introduction = await this.introductionRepository.save(
      createIntroductionDto,
    );

    return {
      id: introduction.id,
      name: introduction.name,
    };
  }

  async findAllIntroduction(): Promise<Introduction[]> {
    return this.introductionRepository.find();
  }

  async findOneIntroduction(id: string): Promise<Introduction> {
    const introduction = await this.introductionRepository.findOne({
      where: { id },
    });

    if (!introduction) {
      throw new NotFoundException('존재하지 않는 소개입니다.');
    }

    return introduction;
  }

  async updateIntroduction(
    id: string,
    updateIntroductionDto: UpdateIntroductionDto,
  ): Promise<IntroductionResponseDto> {
    await this.findOneIntroduction(id);

    if (updateIntroductionDto.name) {
      const existing = await this.introductionRepository.findOne({
        where: {
          name: updateIntroductionDto.name,
          id: Not(id),
        },
      });

      if (existing) {
        throw new ConflictException('이미 존재하는 소개입니다.');
      }
    }

    await this.introductionRepository.update(id, updateIntroductionDto);
    const updatedIntroduction = await this.findOneIntroduction(id);

    return {
      id: updatedIntroduction.id,
      name: updatedIntroduction.name,
    };
  }

  async deleteIntroduction(id: string): Promise<IntroductionResponseDto> {
    const introduction = await this.findOneIntroduction(id);
    await this.introductionRepository.delete(id);

    return {
      id: introduction.id,
      name: introduction.name,
    };
  }
}

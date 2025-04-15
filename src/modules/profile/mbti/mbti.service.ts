import { Injectable, NotFoundException } from '@nestjs/common';
import { Mbti } from './entities/mbti.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserMbtiDto } from './dto/create-mbti.dto';
import {
  MbtiType,
  MBTI_LIST,
  MBTI_RECOMMEND_LIST,
} from './constants/mbti.constants';
import { MbtiRecommendResponse } from './dto/mbti-recommend.response.dto';

@Injectable()
export class MbtiService {
  constructor(
    @InjectRepository(Mbti)
    private readonly mbtiRepository: Repository<Mbti>,
  ) {}

  async createUserMbti(
    profileId: string,
    dto: CreateUserMbtiDto,
  ): Promise<Mbti> {
    const userMbti = MBTI_LIST[dto.mbti];

    if (!userMbti) {
      throw new NotFoundException('Invalid MBTI');
    }

    const existingMbti = await this.mbtiRepository.findOne({
      where: { profile: { id: profileId } },
    });

    const mbti = existingMbti
      ? this.mbtiRepository.merge(existingMbti, { mbti: userMbti })
      : this.mbtiRepository.create({
          mbti: userMbti,
          profile: { id: profileId },
        });

    return this.mbtiRepository.save(mbti);
  }

  async getUserMbti(profileId: string): Promise<Mbti> {
    const mbti = await this.mbtiRepository.findOne({
      where: { profile: { id: profileId } },
    });

    if (!mbti) {
      throw new NotFoundException('MBTI not found');
    }

    return mbti;
  }

  getUserMbtiRecommendList(mbti: MbtiType): MbtiRecommendResponse {
    return {
      recommendations: MBTI_RECOMMEND_LIST[mbti],
    };
  }
}

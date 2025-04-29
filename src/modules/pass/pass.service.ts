import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pass } from './entities/pass.entity';
import { PassType } from './entities/pass-type.enum';

@Injectable()
export class PassService {
  constructor(
    @InjectRepository(Pass)
    private readonly passRepository: Repository<Pass>,
  ) {}

  // 사용자를 거절하는 공통 메서드
  private async createPass(
    userId: string,
    passedUserId: string,
    passType: PassType,
  ): Promise<void> {
    const pass = this.passRepository.create({
      userId,
      passedUserId,
      passType,
    });

    await this.passRepository.save(pass);
  }

  // 매칭 페이지에서 X버튼을 눌러 둘 다 선택하지 않을 때 호출
  async passBothUsers(userId: string, passedUserId: string): Promise<void> {
    await this.createPass(userId, passedUserId, PassType.BOTH);
  }

  // 호감페이지에서 매칭 요청을 거절할 때 호출
  async passMatchRequest(
    userId: string,
    passedUserId: string,
  ): Promise<{ isSuccess: boolean }> {
    await this.createPass(userId, passedUserId, PassType.MATCH);
    return { isSuccess: false };
  }

  // 호감페이지에서 커피챗 요청을 거절할 때 호출
  async passCoffeeChatRequest(
    userId: string,
    passedUserId: string,
  ): Promise<{ isSuccess: boolean }> {
    await this.createPass(userId, passedUserId, PassType.COFFEE_CHAT);
    return { isSuccess: false };
  }

  // 사용자가 거절한 모든 사용자 ID 목록을 조회
  async getPassedUserIds(userId: string): Promise<string[]> {
    const passes = await this.passRepository.find({
      where: { userId },
      select: ['passedUserId'],
    });

    return passes.map((pass) => pass.passedUserId);
  }
}

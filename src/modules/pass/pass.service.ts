import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pass } from './entities/pass.entity';

@Injectable()
export class PassService {
  private readonly logger = new Logger(PassService.name);

  constructor(
    @InjectRepository(Pass)
    private readonly passRepository: Repository<Pass>,
  ) {}

  /**
   * 매칭 페이지에서 X버튼을 눌러 둘 다 선택하지 않을 때 호출됩니다.
   * @param userId 현재 사용자 ID
   * @param passedUserId 거절할 사용자 ID
   */
  async passBothUsers(userId: string, passedUserId: string): Promise<void> {
    this.logger.log(
      `사용자 ${userId}가 ${passedUserId}를 거절했습니다. (BOTH)`,
    );

    const pass = this.passRepository.create({
      userId,
      passedUserId,
      passType: 'BOTH',
    });

    await this.passRepository.save(pass);
  }

  /**
   * 호감페이지에서 매칭 요청을 거절할 때 호출됩니다.
   * @param userId 현재 사용자 ID
   * @param passedUserId 거절할 사용자 ID
   */
  async passMatchRequest(userId: string, passedUserId: string): Promise<void> {
    this.logger.log(
      `사용자 ${userId}가 ${passedUserId}의 매칭 요청을 거절했습니다.`,
    );

    const pass = this.passRepository.create({
      userId,
      passedUserId,
      passType: 'MATCH',
    });

    await this.passRepository.save(pass);
  }

  /**
   * 호감페이지에서 커피챗 요청을 거절할 때 호출됩니다.
   * @param userId 현재 사용자 ID
   * @param passedUserId 거절할 사용자 ID
   */
  async passCoffeeChatRequest(
    userId: string,
    passedUserId: string,
  ): Promise<void> {
    this.logger.log(
      `사용자 ${userId}가 ${passedUserId}의 커피챗 요청을 거절했습니다.`,
    );

    const pass = this.passRepository.create({
      userId,
      passedUserId,
      passType: 'COFFEE_CHAT',
    });

    await this.passRepository.save(pass);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserFilter } from './entities/user-filter.entity';
import { UserService } from '../user/user.service';
import { Repository } from 'typeorm';
import { UserFilterDto } from './dto/user-filter.dto';
import { Request, Response } from 'express';

@Injectable()
export class UserFilterService {
  private readonly logger = new Logger(UserFilterService.name);

  constructor(
    @InjectRepository(UserFilter)
    private readonly userFilterRepository: Repository<UserFilter>,
    private readonly userService: UserService,
  ) {}

  async getUserFilter(userId: string) {
    this.logger.debug(`사용자 ${userId}의 필터 설정을 조회합니다.`);
    const filter = await this.userFilterRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
    });
    this.logger.debug(`조회된 필터 설정: ${JSON.stringify(filter)}`);
    return filter;
  }

  async getFilteredUsers(userId: string) {
    if (!userId) {
      this.logger.debug(`사용자 필터링된 사용자 목록을 조회합니다.`);
      return this.userService.getUserList({
        cursor: null,
        order: ['createdAt_ASC'],
        take: 6,
      });
    } else {
      return this.userService.getUserList({
        cursor: null,
        order: ['createdAt_ASC'],
        take: 6,
      });
    }
  }
  async updateFilter(userId: string, dto: UserFilterDto) {
    this.logger.debug(
      `사용자 ${userId}의 필터 설정을 업데이트합니다: ${JSON.stringify(dto)}`,
    );
    let filter = await this.userFilterRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!filter) {
      this.logger.debug('새로운 필터 설정을 생성합니다.');
      filter = this.userFilterRepository.create({
        ...dto,
        user: { id: userId },
      });
    } else {
      this.logger.debug('기존 필터 설정을 업데이트합니다.');
      Object.assign(filter, dto);
    }

    const result = await this.userFilterRepository.save(filter);
    this.logger.debug(`필터 설정 저장 완료: ${JSON.stringify(result)}`);
    return result;
  }
}

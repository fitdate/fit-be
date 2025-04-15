import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pass } from './entities/pass.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class PassService {
  constructor(
    @InjectRepository(Pass)
    private readonly passRepository: Repository<Pass>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async passUser(userId: string, passedUserId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const passedUser = await this.userRepository.findOne({
      where: { id: passedUserId },
    });

    if (!user || !passedUser) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const pass = this.passRepository.create({
      user,
      passedUser,
    });

    await this.passRepository.save(pass);
  }

  async checkPassStatus(
    userId: string,
    passedUserId: string,
  ): Promise<boolean> {
    const pass = await this.passRepository.findOne({
      where: {
        user: { id: userId },
        passedUser: { id: passedUserId },
      },
    });
    return !!pass;
  }
}

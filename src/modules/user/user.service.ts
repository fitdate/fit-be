import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserSocialDto } from './dto/create-user-social.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  createUser(createUserDto: CreateUserDto) {
    return this.userRepository.save(createUserDto);
  }

  updateUser(id: string, updateUserDto: UpdateUserDto) {
    const isProfileComplete = this.isProfileDataComplete(updateUserDto);

    const data = {
      ...updateUserDto,
      isProfileComplete,
    };

    return this.userRepository.update({ id }, data);
  }

  private isProfileDataComplete(data: UpdateUserDto): boolean {
    const requiredFields = [
      'name',
      'nickname',
      'gender',
      'birthday',
      'phoneNumber',
      'address',
    ];

    return requiredFields.every((field) => {
      const value = data[field as keyof UpdateUserDto];
      return value !== undefined && value !== null && value !== '';
    });
  }

  async createSocialUser(
    createUserSocialDto: CreateUserSocialDto,
  ): Promise<User> {
    const timestamp = Date.now();

    const socialUser = {
      ...createUserSocialDto,
      password: `SOCIAL_LOGIN_${timestamp}`, //소셜 로그인 임시 비밀번호
      nickname: `닉네임을 입력해주세요`, // 임시 닉네임 생성
      isProfileComplete: false, // 프로필 미완성 상태로 시작
    };

    return this.userRepository.save(socialUser);
  }

  // 프로필 완성 상태 업데이트
  async completeUserProfile(id: string, updateData: UpdateUserDto) {
    const isComplete = this.isProfileDataComplete(updateData);

    if (!isComplete) {
      throw new BadRequestException('모든 필수 정보를 입력해야 합니다.');
    }

    // 프로필 완성 상태 추가
    const data = {
      ...updateData,
      isProfileComplete: true,
    };

    await this.userRepository.update({ id }, data);
    return this.findOne(id);
  }

  findUserByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  findUserByNickname(nickname: string) {
    return this.userRepository.findOne({ where: { nickname } });
  }

  findOne(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }
}

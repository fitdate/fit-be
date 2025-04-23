import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserSocialDto } from './dto/create-user-social.dto';
import { FilterUsersDto } from './dto/filter-user.dto';

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
      'nickname',
      'gender',
      'birthday',
      'phone',
      'region',
    ];

    return requiredFields.every((field) => {
      const value = data[field as keyof UpdateUserDto];
      return value !== undefined && value !== null && value !== '';
    });
  }

  async getAllUserInfo() {
    return this.userRepository.find({
      relations: [
        'profile',
        'profile.mbti',
        'profile.userIntroductions',
        'profile.userFeedbacks',
        'profile.interestCategory',
        'profile.profileImages',
      ],
    });
  }

  async getUserInfo(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'profile',
        'profile.mbti',
        'profile.userIntroductions',
        'profile.userFeedbacks',
        'profile.interestCategory',
        'profile.profileImages',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
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
    return this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
  }

  findUserByNickname(nickname: string) {
    return this.userRepository.findOne({ where: { nickname } });
  }

  async findOne(id: string) {
    return this.userRepository.findOne({
      where: { id },
      relations: [
        'profile',
        'profile.mbti',
        'profile.userIntroductions',
        'profile.userFeedbacks',
        'profile.interestCategory',
        'profile.profileImages',
      ],
    });
  }

  async saveUser(userName: string, socketId: string) {
    const user = this.userRepository.create({
      nickname: userName,
      socketId,
    });
    return this.userRepository.save(user);
  }

  async getFilteredUsers(filter: FilterUsersDto, userId: string) {
    const { ageMin, ageMax, minLikes } = filter;
    const today = new Date();

    const currentUser = await this.findOne(userId);
    if (!currentUser) {
      throw new NotFoundException('현재 사용자를 찾을 수 없습니다.');
    }

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('profile.mbti', 'mbti')
      .leftJoinAndSelect('profile.userIntroductions', 'userIntroductions')
      .leftJoinAndSelect('profile.userFeedbacks', 'userFeedbacks')
      .leftJoinAndSelect('profile.interestCategory', 'interestCategory')
      .leftJoinAndSelect('profile.profileImages', 'profileImages')
      .where('user.id != :userId', { userId })
      .andWhere('user.gender != :gender', { gender: currentUser.gender })
      .andWhere('user.isProfileComplete = :isComplete', { isComplete: true });

    if (ageMin) {
      const maxBirthYear = today.getFullYear() - ageMin;
      query.andWhere(
        'CAST(SUBSTRING(user.birthday, 1, 4) AS INTEGER) <= :maxBirthYear',
        { maxBirthYear },
      );
    }

    if (ageMax) {
      const minBirthYear = today.getFullYear() - ageMax;
      query.andWhere(
        'CAST(SUBSTRING(user.birthday, 1, 4) AS INTEGER) >= :minBirthYear',
        { minBirthYear },
      );
    }

    if (minLikes) {
      query.andWhere('user.likeCount >= :minLikes', { minLikes });
    }

    return query.getMany();
  }
}

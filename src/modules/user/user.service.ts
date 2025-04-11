import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  createUser(createUserDto: CreateUserDto) {
    return this.userRepository.save(createUserDto);
  }

  findUserByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  findUserByNickname(nickname: string) {
    return this.userRepository.findOne({ where: { nickname } });
  }

  findOne(id: string) {
    return this.userRepository.findOne({ where: { id: parseInt(id) } });
  }
}

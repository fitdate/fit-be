import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { HashService } from '../hash/hash.service';
import { FindPasswordDto } from '../dto/find-password.dto';
import { FindAndChangePasswordDto } from '../dto/find-and-change-password.dto';
@Injectable()
export class FindAndChangePasswordService {
  protected readonly logger = new Logger(FindAndChangePasswordService.name);

  constructor(
    private readonly userService: UserService,
    private readonly hashService: HashService,
  ) {}

  async findPassword(findPasswordDto: FindPasswordDto) {
    const user = await this.userService.findUserByEmailAndNameAndPhone(
      findPasswordDto.email,
      findPasswordDto.name,
      findPasswordDto.phone,
    );

    if (!user) {
      throw new NotFoundException(
        '이름과 전화번호가 일치하는 사용자가 없습니다.',
      );
    }

    // 나중에 이메일 검증 하던가 하는게 좋음
    return { userId: user.id };
  }

  async findAndChangePassword(
    userId: string,
    findAndChangePasswordDto: FindAndChangePasswordDto,
  ) {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (
      findAndChangePasswordDto.newPassword !==
      findAndChangePasswordDto.confirmPassword
    ) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }

    const isSamePassword = await this.hashService.compare(
      user.password,
      findAndChangePasswordDto.newPassword,
    );

    if (isSamePassword) {
      throw new BadRequestException('이전 비밀번호와 동일합니다.');
    }

    await this.userService.updateUserPassword(
      user.id,
      findAndChangePasswordDto.newPassword,
    );

    return { message: '비밀번호 변경 성공' };
  }
}

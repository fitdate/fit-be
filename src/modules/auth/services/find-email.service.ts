import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { maskEmail } from 'src/common/util/email-mask.util';
import { FindEmailDto } from '../dto/find-email.dto';

@Injectable()
export class FindEmailService {
  protected readonly logger = new Logger(FindEmailService.name);

  constructor(private readonly userService: UserService) {}

  async findEmail(findEmailDto: FindEmailDto) {
    this.logger.log(
      `이메일 찾기 시도: 이름=${findEmailDto.name}, 전화번호=${findEmailDto.phone}`,
    );
    const user = await this.userService.findUserByNameAndPhone(
      findEmailDto.name,
      findEmailDto.phone,
    );
    if (!user) {
      this.logger.error('일치하는 사용자를 찾을 수 없습니다.');
      throw new NotFoundException(
        '이름과 전화번호가 일치하는 사용자가 없습니다.',
      );
    }
    const { maskedEmail } = maskEmail(user.email);
    return maskedEmail;
  }
}

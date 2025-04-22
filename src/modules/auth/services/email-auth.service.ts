import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { RedisService } from '../../redis/redis.service';
import { MailerService } from '../../mailer/mailer.service';
import { SendVerificationEmailDto } from '../dto/send-verification-email.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { parseTimeToSeconds } from 'src/common/util/time.util';

@Injectable()
export class EmailAuthService {
  protected readonly logger = new Logger(EmailAuthService.name);

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly redisService: RedisService,
    private readonly mailerService: MailerService,
  ) {}

  async sendVerificationEmail(
    sendVerificationEmailDto: SendVerificationEmailDto,
  ): Promise<{ success: boolean }> {
    this.logger.log(
      `Sending verification email to: ${sendVerificationEmailDto.email}`,
    );
    const { email } = sendVerificationEmailDto;
    const verificationCode = this.mailerService.generateEmailVerificationCode();

    const codeKey = `verification-code:${verificationCode}`;
    const tokenTtlStr = this.configService.getOrThrow('mailer.tokenTtl', {
      infer: true,
    });
    const tokenTtlSeconds = parseTimeToSeconds(tokenTtlStr);

    await this.redisService.set(codeKey, email, tokenTtlSeconds);
    await this.mailerService.sendEmailVerification(email, verificationCode);

    this.logger.log(
      `Successfully sent verification email to: ${sendVerificationEmailDto.email}`,
    );
    return { success: true };
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ verified: boolean; email: string }> {
    const logBuffer: string[] = [];
    const log = (message: string) => {
      logBuffer.push(message);
      this.logger.log(message);
    };

    log(`Starting email verification for code: ${verifyEmailDto.code}`);

    try {
      const codeKey = `verification-code:${verifyEmailDto.code}`;
      const email = await this.redisService.get(codeKey);
      log(`Looking up email with code key: ${codeKey}`);

      if (!email) {
        log('Verification code not found or expired');
        throw new UnauthorizedException(
          '유효하지 않거나 만료된 인증 코드입니다.',
        );
      }

      const verifiedKey = `email-verified:${email}`;
      const verifiedTtlSeconds = 60 * 60; // 1시간
      await this.redisService.set(verifiedKey, 'verified', verifiedTtlSeconds);
      log(`Email verification status saved for: ${email}`);

      await this.redisService.del(codeKey);
      log(`Verification code deleted for: ${email}`);

      return {
        verified: true,
        email,
      };
    } catch (error) {
      log(
        `Email verification failed: ${
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.'
        }`,
      );
      throw new UnauthorizedException(
        '인증에 실패했습니다. 유효하지 않거나 만료된 인증 코드입니다.',
        { cause: error },
      );
    }
  }

  async checkEmailVerification(email: string): Promise<boolean> {
    this.logger.log(`Checking email verification status for: ${email}`);
    const verifiedKey = `email-verified:${email}`;
    const verifiedValue = await this.redisService.get(verifiedKey);
    this.logger.log(
      `Checking verification - Key: ${verifiedKey}, Value: ${verifiedValue}`,
    );
    return verifiedValue === 'verified';
  }
}

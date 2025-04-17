import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';
import { AllConfig } from 'src/common/config/config.types';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly mailer: NestMailerService,
  ) {}

  async sendEmailVerification(email: string, token?: string): Promise<void> {
    this.logger.log(`Sending email verification to: ${email}`);
    try {
      const verificationCode = token || this.generateEmailVerificationCode();
      this.logger.debug(`Generated verification code for ${email}`);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #333;">이메일 인증</h2>
          <p>안녕하세요! 회원가입을 완료하려면 아래 6자리 인증 코드를 입력해주세요.</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 20px; background-color: #f5f5f5; border-radius: 4px; margin: 20px 0;">${verificationCode}</div>
          <p>위 인증 코드를 회원가입 페이지에 입력하시면 인증이 완료됩니다.</p>
          <p>감사합니다.</p>
        </div>
      `;

      await this.mailer.sendMail({
        to: email,
        subject: '이메일 인증 코드가 발급되었습니다',
        html,
      });

      this.logger.log(`Verification email sent successfully to ${email}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Error sending verification email: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          'Error sending verification email: Unknown error occurred',
        );
      }
      throw error;
    }
  }

  generateEmailVerificationCode(): string {
    this.logger.debug('Generating 6-digit verification code');
    try {
      // 6자리 숫자 코드 생성
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.logger.debug(`Verification code generated successfully: ${code}`);
      return code;
    } catch (error) {
      this.logger.error(`Error generating email verification code: ${error}`);
      throw error;
    }
  }
}

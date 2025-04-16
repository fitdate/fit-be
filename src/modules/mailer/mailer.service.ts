import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AllConfig } from 'src/common/config/config.types';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';
import { EmailPayload } from './types/email-payload.types';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly jwtService: JwtService,
    private readonly mailer: NestMailerService,
  ) {}

  async sendEmailVerification(email: string, token?: string): Promise<void> {
    this.logger.log(`Sending email verification to: ${email}`);
    try {
      const emailToken = token || this.generateEmailToken(email);
      this.logger.debug(`Generated verification token for ${email}`);

      const verifyLink = `${this.configService.getOrThrow('app.host', {
        infer: true,
      })}/auth/verify-email?token=${emailToken}`;
      this.logger.debug(
        `Verification link created: ${verifyLink.substring(0, 30)}...`,
      );

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #333;">이메일 인증</h2>
          <p>안녕하세요! 회원가입을 완료하려면 아래 링크를 클릭하여 이메일 인증을 진행해주세요.</p>
          <a href="${verifyLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 20px 0;">이메일 인증하기</a>
          <p>링크가 작동하지 않는 경우, 아래 URL을 브라우저에 복사하여 붙여넣으세요:</p>
          <p style="word-break: break-all; color: #666;">${verifyLink}</p>
          <p>감사합니다.</p>
        </div>
      `;

      await this.mailer.sendMail({
        to: email,
        subject: '이메일 인증을 완료해주세요',
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

  generateEmailToken(email: string): string {
    this.logger.debug(`Generating token for email: ${email}`);
    try {
      const secret = this.configService.getOrThrow('mailer.password', {
        infer: true,
      });

      const signOptions = {
        expiresIn: this.configService.getOrThrow('mailer.tokenTtl', {
          infer: true,
        }),
      };

      const token = this.jwtService.sign({ email }, { secret, ...signOptions });
      this.logger.debug(`Token generated successfully`);
      return token;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Error generating email token: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          'Error generating email token: Unknown error occurred',
        );
      }
      throw error;
    }
  }

  verifyMailerToken(token: string): EmailPayload {
    this.logger.debug(`Verifying token: ${token.substring(0, 10)}...`);
    try {
      const secret = this.configService.getOrThrow('mailer.password', {
        infer: true,
      });

      const signOptions = {
        expiresIn: this.configService.getOrThrow('mailer.tokenTtl', {
          infer: true,
        }),
      };

      const payload = this.jwtService.verify<EmailPayload>(token, {
        secret,
        ...signOptions,
      });

      this.logger.debug(
        `Token verified successfully for email: ${payload.email}`,
      );
      return payload;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Token verification failed: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error('Token verification failed: Unknown error occurred');
      }
      throw error;
    }
  }
}

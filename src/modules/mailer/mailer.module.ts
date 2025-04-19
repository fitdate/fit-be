import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { MailerController } from './mailer.controller';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AllConfig, MailerConfig } from '../../common/config/config.types';

@Module({
  imports: [
    NestMailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfig>) => {
        const mailerConfig = configService.getOrThrow<MailerConfig>('mailer');
        return {
          transport: {
            host: mailerConfig.MAILER_HOST,
            port: mailerConfig.MAILER_PORT,
            secure: true,
            auth: {
              user: mailerConfig.MAILER_USER,
              pass: mailerConfig.MAILER_PASSWORD,
            },
          },
        };
      },
    }),
  ],
  controllers: [MailerController],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}

import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { MailerController } from './mailer.controller';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AllConfig } from '../../common/config/config.types';

@Module({
  imports: [
    NestMailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfig>) => ({
        transport: {
          host: configService.getOrThrow('mailer.MAILER_HOST', { infer: true }),
          port: configService.getOrThrow('mailer.MAILER_PORT', { infer: true }),
          secure: true,
          auth: {
            user: configService.getOrThrow('mailer.MAILER_USER', {
              infer: true,
            }),
            pass: configService.getOrThrow('mailer.MAILER_PASSWORD', {
              infer: true,
            }),
          },
        },
      }),
    }),
  ],
  controllers: [MailerController],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}

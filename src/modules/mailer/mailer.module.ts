import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { MailerController } from './mailer.controller';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AllConfig } from '../../common/config/config.types';
@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule,
    NestMailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<AllConfig>) => ({
        transport: {
          host: configService.getOrThrow('mailer.host', { infer: true }),
          port: configService.getOrThrow('mailer.port', { infer: true }),
          secure: true,
          auth: {
            user: configService.getOrThrow('mailer.user', { infer: true }),
            pass: configService.getOrThrow('mailer.password', { infer: true }),
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MailerController],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}

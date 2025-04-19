import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { MatchModule } from './modules/match/match.module';
import { LikeModule } from './modules/like/like.module';
import { PassModule } from './modules/pass/pass.module';
import { ChatRoomModule } from './modules/chat-room/chat-room.module';
import { MessageModule } from './modules/message/message.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { MbtiModule } from './modules/profile/mbti/mbti.module';
import { ProfileImageModule } from './modules/profile/profile-image/profile-image.module';
import { FeedbackModule } from './modules/profile/feedback/common/feedback.module';
import { IntroductionModule } from './modules/profile/introduction/common/introduction.module';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { RBACGuard } from './modules/auth/guard/rbac.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from './common/config/config';
import { AllConfig } from './common/config/config.types';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './modules/auth/guard/jwt.guard';
import { BearerTokenMiddleware } from './modules/auth/middleware/bearer-token.middleware';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { LocationModule } from './modules/location/location.module';
import { InterestCategoryModule } from './modules/profile/interest-category/common/interest-category.module';
import { LoggingInterceptor } from './common/interceptor/logging.interceptor';
import { SeedManagerModule } from './modules/seed/seed-manager.module';
import { S3Module } from './modules/s3/s3.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { ProfileCompleteGuard } from './modules/auth/guard/profile-complete.guard';
import { AdminModule } from './modules/admin/admin.module';
import { AuthController } from './modules/auth/auth.controller';
import { UserController } from './modules/user/user.controller';
import { ProfileController } from './modules/profile/profile.controller';
import { MatchController } from './modules/match/match.controller';
import { LikeController } from './modules/like/like.controller';
import { PassController } from './modules/pass/pass.controller';
import { ChatRoomController } from './modules/chat-room/chat-room.controller';
import { MessageController } from './modules/message/message.controller';
import { NotificationController } from './modules/notification/notification.controller';
import { PaymentController } from './modules/payment/payment.controller';
import { InterestCategoryController } from './modules/profile/interest-category/common/interest-category.controller';
import { MbtiController } from './modules/profile/mbti/mbti.controller';
import { ProfileImageController } from './modules/profile/profile-image/profile-image.controller';
import { FeedbackController } from './modules/profile/feedback/common/feedback.controller';
import { IntroductionController } from './modules/profile/introduction/common/introduction.controller';
import { LocationController } from './modules/location/location.controller';
import { SeedManagerController } from './modules/seed/seed-manager.controller';
import { S3Controller } from './modules/s3/s3.controller';
import { MailerController } from './modules/mailer/mailer.controller';
import { AdminController } from './modules/admin/admin.controller';

@Module({
  imports: [
    DevtoolsModule.register({
      http: true,
      port: 7001,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (
        configService: ConfigService<AllConfig>,
      ): PostgresConnectionOptions => ({
        type: 'postgres',
        host: configService.getOrThrow('database.host', { infer: true }),
        port: configService.getOrThrow('database.port', { infer: true }),
        username: configService.getOrThrow('database.username', {
          infer: true,
        }),
        password: configService.getOrThrow('database.password', {
          infer: true,
        }),
        database: configService.getOrThrow('database.name', {
          infer: true,
        }),
        entities: [join(__dirname, '/**/*.entity{.ts,.js}')],
        migrations: [join(__dirname, '/migration/*{.ts,.js}')],
        migrationsRun: true,
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    DevtoolsModule.register({
      http: process.env.dev !== 'production',
    }),
    AuthModule,
    ProfileModule,
    MatchModule,
    LikeModule,
    PassModule,
    ChatRoomModule,
    MessageModule,
    NotificationModule,
    PaymentModule,
    InterestCategoryModule,
    MbtiModule,
    ProfileImageModule,
    FeedbackModule,
    IntroductionModule,
    UserModule,
    LocationModule,
    SeedManagerModule,
    S3Module,
    MailerModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ProfileCompleteGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RBACGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(BearerTokenMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/send-verification-email', method: RequestMethod.POST },
        { path: 'auth/verify-email', method: RequestMethod.POST },
        { path: 'auth/google', method: RequestMethod.GET },
        { path: 'auth/google/login/callback', method: RequestMethod.GET },
        { path: 'auth/kakao', method: RequestMethod.GET },
        { path: 'auth/kakao/login/callback', method: RequestMethod.GET },
        { path: 'auth/naver', method: RequestMethod.GET },
        { path: 'auth/naver/login/callback', method: RequestMethod.GET },
        { path: 'health', method: RequestMethod.GET },
        { path: 'docs', method: RequestMethod.GET },
      )
      .forRoutes(
        AppController,
        AuthController,
        UserController,
        ProfileController,
        MatchController,
        LikeController,
        PassController,
        ChatRoomController,
        MessageController,
        NotificationController,
        PaymentController,
        InterestCategoryController,
        MbtiController,
        ProfileImageController,
        FeedbackController,
        IntroductionController,
        LocationController,
        SeedManagerController,
        S3Controller,
        MailerController,
        AdminController,
      );
  }
}

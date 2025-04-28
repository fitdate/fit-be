import {
  MiddlewareConsumer,
  Module,
  NestModule,
  // RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { MatchModule } from './modules/match/match.module';
import { LikeModule } from './modules/like/like.module';
import { PassModule } from './modules/pass/pass.module';
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
import { config, validationSchema } from './common/config/config';
import { AllConfig } from './common/config/config.types';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
// import { AuthMiddleware } from './modules/auth/middleware/auth.middleware';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { LocationModule } from './modules/location/location.module';
import { InterestCategoryModule } from './modules/profile/interest-category/common/interest-category.module';
import { LoggingInterceptor } from './common/interceptor/logging.interceptor';
import { SeedManagerModule } from './modules/seed/seed-manager.module';
import { S3Module } from './modules/s3/s3.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { AdminModule } from './modules/admin/admin.module';
// import { AuthController } from './modules/auth/auth.controller';
// import { UserController } from './modules/user/user.controller';
// import { ProfileController } from './modules/profile/profile.controller';
// import { MatchController } from './modules/match/match.controller';
// import { LikeController } from './modules/like/like.controller';
// import { PassController } from './modules/pass/pass.controller';
// import { NotificationController } from './modules/notification/notification.controller';
// import { PaymentController } from './modules/payment/payment.controller';
// import { InterestCategoryController } from './modules/profile/interest-category/common/interest-category.controller';
// import { MbtiController } from './modules/profile/mbti/mbti.controller';
// import { ProfileImageController } from './modules/profile/profile-image/profile-image.controller';
// import { FeedbackController } from './modules/profile/feedback/common/feedback.controller';
// import { IntroductionController } from './modules/profile/introduction/common/introduction.controller';
// import { LocationController } from './modules/location/location.controller';
// import { SeedManagerController } from './modules/seed/seed-manager.controller';
// import { S3Controller } from './modules/s3/s3.controller';
// import { MailerController } from './modules/mailer/mailer.controller';
// import { AdminController } from './modules/admin/admin.controller';
import { ChatModule } from './modules/chat/chat.module';
// import { ChatController } from './modules/chat/chat.controller';
import { UserFilterModule } from './modules/user-filter/user-filter.module';
import { Reflector } from '@nestjs/core';
import { ActivityMiddleware } from './modules/auth/middleware/activity.middleware';
import { FilterModule } from './modules/filter/filter.module';
import { JwtAuthGuard } from './modules/auth/guard/auth.guard';
import { CoffeeChatModule } from './modules/coffee-chat/coffee-chat.module';
import { DatingPreferenceModule } from './modules/dating-preference/dating-preference.module';
import { SparkListModule } from './modules/spark-list/spark-list.module';
import { FestivalModule } from './modules/festival/festival.module';
import { ScheduleModule } from '@nestjs/schedule';
@Module({
  imports: [
    DevtoolsModule.register({
      http: process.env.dev !== 'production',
      port: 7001,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath:
        process.env.NODE_ENV === 'production' ? process.env.ENV_FILE : '.env',
      validationSchema: validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
        stripUnknown: true,
      },
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
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        synchronize: false,
        logging: true,
        extra: {
          max: 2, // 최대 연결 풀 크기 (동시에 유지할 수 있는 최대 연결 수)
          min: 1, // 최소 연결 풀 크기 (항상 유지할 최소 연결 수)
          idleTimeoutMillis: 5000, // 사용하지 않는 연결이 유지되는 최대 시간 (5초)
          connectionTimeoutMillis: 2000, // 연결 시도 타임아웃 (2초)
          maxRetries: 1, // 연결 실패 시 최대 재시도 횟수 (1회)
          retryDelay: 1000, // 재시도 간격 (1초)
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ProfileModule,
    MatchModule,
    LikeModule,
    PassModule,
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
    ChatModule,
    UserFilterModule,
    FilterModule,
    CoffeeChatModule,
    ChatModule,
    DatingPreferenceModule,
    SparkListModule,
    FestivalModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // {
    //   provide: APP_GUARD,
    //   useClass: ProfileCompleteGuard,
    // },
    {
      provide: APP_GUARD,
      useClass: RBACGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    Reflector,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ActivityMiddleware).forRoutes('*');
    // consumer
    //   .apply(AuthMiddleware)
    //   .exclude(
    //     { path: 'auth/login', method: RequestMethod.POST },
    //     { path: 'auth/register', method: RequestMethod.POST },
    //     { path: 'auth/send-verification-email', method: RequestMethod.POST },
    //     { path: 'auth/verify-email', method: RequestMethod.POST },
    //     { path: 'auth/google', method: RequestMethod.GET },
    //     { path: 'auth/google/login/callback', method: RequestMethod.GET },
    //     { path: 'auth/kakao', method: RequestMethod.GET },
    //     { path: 'auth/kakao/login/callback', method: RequestMethod.GET },
    //     { path: 'auth/naver', method: RequestMethod.GET },
    //     { path: 'auth/naver/login/callback', method: RequestMethod.GET },
    //     { path: 'health', method: RequestMethod.GET },
    //     { path: 'docs', method: RequestMethod.GET },
    //     { path: 'auth/check-email', method: RequestMethod.POST },
    //     { path: 'auth/check-nickname', method: RequestMethod.POST },
    //     { path: 'auth/email-login', method: RequestMethod.POST },
    //     { path: 'auth/email-temp-register', method: RequestMethod.POST },
    //     { path: 'auth/email-temp-register/verify', method: RequestMethod.POST },
    //     {
    //       path: 'auth/email-temp-register/verify-email',
    //       method: RequestMethod.POST,
    //     },
    //     {
    //       path: 'auth/email-temp-register/verify-email',
    //       method: RequestMethod.POST,
    //     },
    //   )
    //   .forRoutes(
    //     AuthController,
    //     UserController,
    //     ProfileController,
    //     MatchController,
    //     LikeController,
    //     PassController,
    //     NotificationController,
    //     PaymentController,
    //     InterestCategoryController,
    //     MbtiController,
    //     ProfileImageController,
    //     FeedbackController,
    //     IntroductionController,
    //     LocationController,
    //     SeedManagerController,
    //     S3Controller,
    //     MailerController,
    //     AdminController,
    //     AppController,
    //     ChatController,
    //   );
  }
}

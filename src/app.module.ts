import { Module } from '@nestjs/common';
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
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { LocationModule } from './modules/location/location.module';
import { InterestCategoryModule } from './modules/profile/interest-category/common/interest-category.module';
import { LoggingInterceptor } from './common/interceptor/logging.interceptor';
import { SeedManagerModule } from './modules/seed/seed-manager.module';
import { S3Module } from './modules/s3/s3.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { AdminModule } from './modules/admin/admin.module';
import { ChatModule } from './modules/chat/chat.module';
import { UserFilterModule } from './modules/user-filter/user-filter.module';
import { Reflector } from '@nestjs/core';
import { FilterModule } from './modules/filter/filter.module';
import { JwtAuthGuard } from './modules/auth/guard/auth.guard';
import { CoffeeChatModule } from './modules/coffee-chat/coffee-chat.module';
import { DatingPreferenceModule } from './modules/dating-preference/dating-preference.module';
import { SparkListModule } from './modules/spark-list/spark-list.module';
import { FestivalModule } from './modules/festival/festival.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ActiveInterceptor } from './modules/auth/interceptor/active.interceptor';
import { TaskModule } from './modules/task/task.module';
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
        synchronize: true,
        logging: true,
        extra: {
          max: 2,
          min: 1,
          idleTimeoutMillis: 5000,
          connectionTimeoutMillis: 2000,
          maxRetries: 1,
          retryDelay: 1000,
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
    TaskModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RBACGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ActiveInterceptor,
    },
    Reflector,
  ],
})
export class AppModule {}

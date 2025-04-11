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
import { InterestLocationModule } from './modules/profile/interest-location/interest-location.module';
import { InterestCategoryModule } from './modules/profile/interest-category/interest-category.module';
import { MbtiModule } from './modules/profile/mbti/mbti.module';
import { ProfileImageModule } from './modules/profile/profile-image/profile-image.module';
import { FeedbackModule } from './modules/profile/feedback/feedback.module';
import { IntroductionModule } from './modules/profile/introduction/introduction.module';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { RBACGuard } from './modules/auth/guard/rbac.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configuration } from './common/config/config';
import { AllConfig } from './common/config/config.types';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './modules/auth/guard/jwt.guard';
import { BearerTokenMiddleware } from './modules/auth/middleware/bearer-token.middleware';
import { DevtoolsModule } from '@nestjs/devtools-integration';
@Module({
  imports: [
    DevtoolsModule.register({
      http: true,
      port: 7001,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
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
        migrations: [join(__dirname, '/**/*.migration{.ts,.js}')],
        synchronize: true,
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
    InterestLocationModule,
    InterestCategoryModule,
    MbtiModule,
    ProfileImageModule,
    FeedbackModule,
    IntroductionModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RBACGuard,
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
      )
      .forRoutes('*');
  }
}

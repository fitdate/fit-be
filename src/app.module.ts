import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ChatRoomModule } from './modules/chat-room/chat-room.module';
import { LikeModule } from './modules/like/like.module';
import { MatchModule } from './modules/match/match.module';
import { MessageModule } from './modules/message/message.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PassModule } from './modules/pass/pass.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ProfileModule } from './modules/profile/profile.module';
import { UserModule } from './modules/user/user.module';
import { FeedbackModule } from './modules/profile/feedback/feedback.module';
import { InterestCategoryModule } from './modules/profile/interest-category/interest-category.module';
import { InterestLocationModule } from './modules/profile/interest-location/interest-location.module';
import { IntroductionModule } from './modules/profile/introduction/introduction.module';
import { MbtiModule } from './modules/profile/mbti/mbti.module';
import { ProfileImageModule } from './modules/profile/profile-image/profile-image.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configuration } from './common/config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllConfig } from './common/config/config.types';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { User } from './modules/user/entities/user.entity';
import { InterestLocation } from './modules/profile/interest-location/entities/interest-location.entity';
import { InterestCategory } from './modules/profile/interest-category/entities/interest-category.entity';
import { ProfileImage } from './modules/profile/profile-image/entities/profile-image.entity';
import { join } from 'path';
import { DevtoolsModule } from '@nestjs/devtools-integration';

@Module({
  imports: [
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
        entities: [User, InterestLocation, InterestCategory, ProfileImage],
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
    ChatRoomModule,
    LikeModule,
    MatchModule,
    MessageModule,
    NotificationModule,
    PassModule,
    PaymentModule,
    ProfileModule,
    UserModule,
    FeedbackModule,
    InterestCategoryModule,
    InterestLocationModule,
    IntroductionModule,
    MbtiModule,
    ProfileImageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

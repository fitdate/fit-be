import { FeedbackModule } from './../profile/feedback/common/feedback.module';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HashService } from './hash/hash.service';
import { BcryptService } from './hash/bcrypt.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy/jwt.strategy';
import { GoogleStrategy } from './strategy/google.strategy';
import { MailerModule } from '../mailer/mailer.module';
import { RedisModule } from '../redis/redis.module';
import { LocationModule } from '../location/location.module';
import { ProfileModule } from '../profile/profile.module';
import { S3Module } from '../s3/s3.module';
import { ProfileImageModule } from '../profile/profile-image/profile-image.module';
import { SocialAuthService } from './services/social-auth.service';
import { EmailAuthService } from './services/email-auth.service';
import { InterestCategoryModule } from '../profile/interest-category/common/interest-category.module';
import { IntroductionModule } from '../profile/introduction/common/introduction.module';
import { TokenModule } from '../token/token.module';
@Module({
  imports: [
    UserModule,
    JwtModule.register({}),
    MailerModule,
    RedisModule,
    LocationModule,
    ProfileModule,
    S3Module,
    ProfileImageModule,
    InterestCategoryModule,
    FeedbackModule,
    IntroductionModule,
    TokenModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: HashService,
      useClass: BcryptService,
    },
    SocialAuthService,
    EmailAuthService,
    JwtStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

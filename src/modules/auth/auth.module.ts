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
@Module({
  imports: [UserModule, JwtModule.register({}), MailerModule, RedisModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: HashService,
      useClass: BcryptService,
    },
    JwtStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { RedisModule } from '../redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
@Module({
  imports: [RedisModule, ConfigModule, JwtModule.register({})],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}

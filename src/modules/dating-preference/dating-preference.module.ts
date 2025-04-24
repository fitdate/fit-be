import { Module } from '@nestjs/common';
import { DatingPreferenceService } from './dating-preference.service';
import { DatingPreferenceController } from './dating-preference.controller';
import { DatingPreference } from './entities/dating-preference.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
@Module({
  imports: [TypeOrmModule.forFeature([DatingPreference]), UserModule],
  controllers: [DatingPreferenceController],
  providers: [DatingPreferenceService],
})
export class DatingPreferenceModule {}

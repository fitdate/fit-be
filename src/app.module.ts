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

@Module({
  imports: [
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

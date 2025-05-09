import { Controller, Post, Body, Get } from '@nestjs/common';
import { CoffeeChatService } from './coffee-chat.service';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { CreateNotificationDto } from 'src/modules/notification/dto/create-notification.dto';
import { AcceptCoffeeChatDto } from './dto/accept-coffee-chat.dto';
@Controller('coffee-chat')
export class CoffeeChatController {
  private readonly logger = new Logger(CoffeeChatController.name);

  constructor(private readonly coffeeChatService: CoffeeChatService) {}

  @ApiOperation({ summary: '커피챗 보내기' })
  @ApiResponse({ status: 200, description: '커피챗 보내기 성공' })
  @ApiResponse({ status: 400, description: '커피챗 보내기 실패' })
  @ApiBody({ type: CreateNotificationDto })
  @Post('send')
  sendCoffeeChat(
    @UserId() userId: string,
    @Body() notificationDto: CreateNotificationDto,
  ) {
    return this.coffeeChatService.sendCoffeeChat(userId, notificationDto);
  }

  @ApiOperation({ summary: '커피챗 수락' })
  @ApiResponse({ status: 200, description: '커피챗 수락 성공' })
  @ApiResponse({ status: 400, description: '커피챗 수락 실패' })
  @ApiBody({ type: AcceptCoffeeChatDto })
  @Post('accept')
  acceptCoffeeChat(
    @UserId() userId: string,
    @Body() acceptCoffeeChatDto: AcceptCoffeeChatDto,
  ) {
    return this.coffeeChatService.acceptCoffeeChat(userId, acceptCoffeeChatDto);
  }

  @ApiOperation({ summary: '커피챗 거절' })
  @ApiResponse({ status: 200, description: '커피챗 거절 성공' })
  @ApiResponse({ status: 400, description: '커피챗 거절 실패' })
  @ApiBody({ type: CreateNotificationDto })
  @Post('remove')
  removeCoffeeChat(
    @UserId() userId: string,
    @Body() notificationDto: CreateNotificationDto,
  ) {
    return this.coffeeChatService.removeCoffeeChat(userId, notificationDto);
  }

  @ApiOperation({ summary: '받은 커피챗 리스트 가져오기' })
  @ApiResponse({ status: 200, description: '받은 커피챗 리스트 가져오기 성공' })
  @ApiResponse({ status: 400, description: '받은 커피챗 리스트 가져오기 실패' })
  @Get('received')
  getReceivedCoffeeChatList(@UserId() userId: string) {
    return this.coffeeChatService.getReceivedCoffeeChatList(userId);
  }
}

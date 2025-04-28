import {
  Controller,
  Post,
  Body,
  Get,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { CoffeeChatService } from './coffee-chat.service';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { SendCoffeeChatDto } from './dto/send-coffee-chat.dto';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AcceptCoffeeChatDto } from './dto/accept-coffee-chat.dto';
import { Logger } from '@nestjs/common';

@Controller('coffee-chat')
export class CoffeeChatController {
  private readonly logger = new Logger(CoffeeChatController.name);

  constructor(private readonly coffeeChatService: CoffeeChatService) {}

  @ApiOperation({ summary: '커피챗 보내기' })
  @ApiResponse({ status: 200, description: '커피챗 보내기 성공' })
  @ApiResponse({ status: 400, description: '커피챗 보내기 실패' })
  @ApiParam({ name: 'receiverId', description: '커피챗 받는 사람의 ID' })
  @Post('send')
  sendCoffeeChat(@UserId() userId: string, @Param('receiverId') receiverId: string) {
    this.logger.debug(`Request body: ${JSON.stringify(receiverId)}`);
    this.logger.debug(`User ID: ${userId}`);

    if (!receiverId) {
      this.logger.error('Receiver ID is missing in request body');
      throw new BadRequestException('Receiver ID is required');
    }

    return this.coffeeChatService.sendCoffeeChat(userId, receiverId);
  }

  @ApiOperation({ summary: '커피챗 수락' })
  @ApiResponse({ status: 200, description: '커피챗 수락 성공' })
  @ApiResponse({ status: 400, description: '커피챗 수락 실패' })
  @ApiParam({
    name: 'senderId',
    description: '보내는 사람의 ID',
  })
  @Post('accept')
  acceptCoffeeChat(@UserId() userId: string, @Param('senderId') senderId: string) {
    return this.coffeeChatService.acceptCoffeeChat(userId, senderId);
  }

  @ApiOperation({ summary: '받은 커피챗 리스트 가져오기' })
  @ApiResponse({ status: 200, description: '받은 커피챗 리스트 가져오기 성공' })
  @ApiResponse({ status: 400, description: '받은 커피챗 리스트 가져오기 실패' })
  @Get('received')
  getReceivedCoffeeChatList(@UserId() userId: string) {
    return this.coffeeChatService.getReceivedCoffeeChatList(userId);
  }

  @ApiOperation({ summary: '보낸 커피챗 리스트 가져오기' })
  @ApiResponse({ status: 200, description: '보낸 커피챗 리스트 가져오기 성공' })
  @ApiResponse({ status: 400, description: '보낸 커피챗 리스트 가져오기 실패' })
  @Get('sent')
  getSentCoffeeChatList(@UserId() userId: string) {
    return this.coffeeChatService.getSentCoffeeChatList(userId);
  }

  @ApiOperation({ summary: '성사된 커피챗 리스트 가져오기' })
  @ApiResponse({
    status: 200,
    description: '성사된 커피챗 리스트 가져오기 성공',
  })
  @ApiResponse({
    status: 400,
    description: '성사된 커피챗 리스트 가져오기 실패',
  })
  @Get('accepted')
  getAcceptedCoffeeChatList(@UserId() userId: string) {
    return this.coffeeChatService.getAcceptedCoffeeChatList(userId);
  }
}

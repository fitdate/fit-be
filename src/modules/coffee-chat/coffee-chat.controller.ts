import {
  Controller,
  Post,
  Body,
  Get,
  BadRequestException,
} from '@nestjs/common';
import { CoffeeChatService } from './coffee-chat.service';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { SendCoffeeChatDto } from './dto/send-coffee-chat.dto';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

@Controller('coffee-chat')
export class CoffeeChatController {
  private readonly logger = new Logger(CoffeeChatController.name);

  constructor(private readonly coffeeChatService: CoffeeChatService) {}

  @ApiOperation({ summary: '커피챗 보내기' })
  @ApiResponse({ status: 200, description: '커피챗 보내기 성공' })
  @ApiResponse({ status: 400, description: '커피챗 보내기 실패' })
  @ApiBody({ type: SendCoffeeChatDto })
  @Post('send')
  sendCoffeeChat(
    @UserId() userId: string,
    @Body() sendCoffeeChatDto: SendCoffeeChatDto,
  ) {
    this.logger.debug(`Request body: ${JSON.stringify(sendCoffeeChatDto)}`);
    this.logger.debug(`User ID: ${userId}`);

    if (!sendCoffeeChatDto.receiverId) {
      this.logger.error('Receiver ID is missing in request body');
      throw new BadRequestException('Receiver ID is required');
    }

    return this.coffeeChatService.sendCoffeeChat(userId, sendCoffeeChatDto);
  }

  @ApiOperation({ summary: '받은 커피챗 리스트 가져오기' })
  @ApiResponse({ status: 200, description: '받은 커피챗 리스트 가져오기 성공' })
  @ApiResponse({ status: 400, description: '받은 커피챗 리스트 가져오기 실패' })
  @Get('received')
  getReceivedCoffeeChatList(@UserId() userId: string) {
    return this.coffeeChatService.getReceivedCoffeeChatList(userId);
  }
}

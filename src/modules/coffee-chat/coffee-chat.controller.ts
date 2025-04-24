import { Controller, Post, Body } from '@nestjs/common';
import { CoffeeChatService } from './coffee-chat.service';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { SendCoffeeChatDto } from './dto/send-coffee-chat.dto';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AcceptCoffeeChatDto } from './dto/accept-coffee-chat.dto';

@Controller('coffee-chat')
export class CoffeeChatController {
  constructor(private readonly coffeeChatService: CoffeeChatService) {}
  @ApiOperation({ summary: '커피챗 보내기' })
  @ApiResponse({ status: 200, description: '커피챗 보내기 성공' })
  @ApiResponse({ status: 400, description: '커피챗 보내기 실패' })
  @ApiParam({ name: 'receiverId', description: '커피챗 받는 사람의 ID' })
  @Post('send')
  sendCoffeeChat(
    @UserId() userId: string,
    @Body() sendCoffeeChatDto: SendCoffeeChatDto,
  ) {
    return this.coffeeChatService.sendCoffeeChat(userId, sendCoffeeChatDto);
  }

  @ApiOperation({ summary: '커피챗 수락' })
  @ApiResponse({ status: 200, description: '커피챗 수락 성공' })
  @ApiResponse({ status: 400, description: '커피챗 수락 실패' })
  @ApiParam({ name: 'senderId', description: '커피챗 보낸 사람의 ID' })
  @Post('accept')
  acceptCoffeeChat(
    @UserId() userId: string,
    @Body() acceptCoffeeChatDto: AcceptCoffeeChatDto,
  ) {
    return this.coffeeChatService.acceptCoffeeChat(
      userId,
      acceptCoffeeChatDto.senderId,
    );
  }
}

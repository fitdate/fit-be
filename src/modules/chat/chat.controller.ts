import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserId } from '../../common/decorator/get-user.decorator';
import { CreateMatchingRoomDto } from './dto/create-matching-room.dto';
import { FindOrCreateChatRoomDto } from './dto/find-or-create-chat-room.dto';
import { AcceptCoffeeChatDto } from './dto/accept-coffee-chat.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('matchingRooms/:partnerId')
  @ApiOperation({
    summary: '대화하러 가기 버튼 클릭 시 채팅방 입장',
    description:
      '매칭 결과 페이지에서 대화하러 가기 버튼을 클릭하면 호출됩니다. 기존 채팅방이 있으면 해당 채팅방을 반환하고, 없으면 새로 생성합니다.',
  })
  @ApiResponse({ status: 201, description: '채팅방 입장 성공' })
  @ApiParam({
    name: 'partnerId',
    description: '매칭된 상대방의 ID',
    example: '',
  })
  async createMatchingRoom(
    @UserId() userId: string,
    @Param() params: CreateMatchingRoomDto,
  ) {
    return this.chatService.createMatchingRoom(userId, params.partnerId);
  }

  @Post('chatRooms/findOrCreate/:partnerId')
  @ApiOperation({
    summary: '대화방 버튼 클릭 시 채팅방 입장',
    description:
      '채팅 페이지에서 대화방 버튼을 클릭하면 호출됩니다. 기존 채팅방이 있으면 해당 채팅방을 반환하고, 없으면 새로 생성합니다.',
  })
  @ApiResponse({ status: 201, description: '채팅방 입장 성공' })
  @ApiParam({
    name: 'partnerId',
    description: '채팅방 상대방 사용자 ID',
    example: '',
  })
  async findOrCreateChatRoom(
    @UserId() userId: string,
    @Param() params: FindOrCreateChatRoomDto,
  ) {
    return this.chatService.findOrCreateChatRoom(userId, params.partnerId);
  }

  @Post('coffee-chat/accept/:partnerId')
  @ApiOperation({ summary: '커피챗 수락' })
  @ApiResponse({
    status: 201,
    description: '커피챗 수락 성공',
  })
  @ApiParam({
    name: 'partnerId',
    description: '커피챗을 보낸 상대방의 ID',
    example: '',
  })
  async acceptCoffeeChat(
    @UserId() userId: string,
    @Param() params: AcceptCoffeeChatDto,
  ) {
    return this.chatService.acceptCoffeeChat(userId, params.partnerId);
  }

  @Post('match/accept/:partnerId')
  @ApiOperation({ summary: '매칭 수락' })
  @ApiResponse({
    status: 201,
    description: '매칭 수락 성공',
  })
  @ApiParam({
    name: 'partnerId',
    description: '매칭된 상대방의 ID',
    example: '',
  })
  async acceptMatch(
    @UserId() userId: string,
    @Param() params: AcceptCoffeeChatDto,
  ) {
    return this.chatService.acceptMatch(userId, params.partnerId);
  }

  @ApiOperation({
    summary: '채팅방 목록 조회',
    description: '사용자의 채팅방 목록을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '채팅방 목록 조회 성공' })
  @Get('chatRooms')
  async getRooms(@UserId() userId: string) {
    return this.chatService.getRooms(userId);
  }

  @ApiOperation({
    summary: '채팅 메시지 조회',
    description:
      '채팅방의 메시지를 최신순으로 조회합니다. 최신 50개의 메시지를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '채팅 메시지 조회 성공' })
  @Get('messages')
  async getMessages(@Query('chatRoomId') chatRoomId: string) {
    return this.chatService.getMessages(chatRoomId);
  }

  @ApiOperation({ summary: '채팅방 나가기' })
  @ApiResponse({ status: 200, description: '채팅방 나가기 성공' })
  @Delete('chatRooms/:chatRoomId/exit')
  async exitRoom(
    @Param('chatRoomId') chatRoomId: string,
    @Body('userId') userId: string,
  ) {
    return this.chatService.exitRoom(chatRoomId, userId);
  }
}

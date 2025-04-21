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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: '채팅방 생성' })
  @ApiResponse({ status: 201, description: '채팅방이 성공적으로 생성됨' })
  @Post('chatRooms')
  async createRoom(@Body('name') name: string) {
    return this.chatService.createRoom(name);
  }

  @ApiOperation({ summary: '채팅방 목록 조회' })
  @ApiResponse({ status: 200, description: '채팅방 목록 조회 성공' })
  @Get('chatRooms')
  async getRooms() {
    return this.chatService.getRooms();
  }

  @ApiOperation({ summary: '채팅방 상세 정보 조회' })
  @ApiResponse({ status: 200, description: '채팅방 상세 정보 조회 성공' })
  @Get('chatRooms/:chatRoomId')
  async getRoom(@Param('chatRoomId') chatRoomId: string) {
    return this.chatService.getRoom(chatRoomId);
  }

  @ApiOperation({ summary: '채팅방 참여자 목록 조회' })
  @ApiResponse({ status: 200, description: '채팅방 참여자 목록 조회 성공' })
  @Get('chatRooms/:chatRoomId/users')
  async getRoomUsers(@Param('chatRoomId') chatRoomId: string) {
    return this.chatService.getRoomUsers(chatRoomId);
  }

  @ApiOperation({ summary: '채팅 메시지 조회' })
  @ApiResponse({ status: 200, description: '채팅 메시지 조회 성공' })
  @Get('messages')
  async getMessages(@Query('chatRoomId') chatRoomId?: string) {
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

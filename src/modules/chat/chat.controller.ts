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
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { UserId } from '../../common/decorator/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { CreateMatchingRoomDto } from './dto/create-matching-room.dto';
import { FindOrCreateChatRoomDto } from './dto/find-or-create-chat-room.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({
    summary: '매칭 채팅방 생성',
    description:
      '매칭 결과 페이지 👉 결과보기 👉 "대화하러 가기" 클릭 시 호출됩니다.',
  })
  @ApiResponse({ status: 201, description: '매칭 채팅방이 성공적으로 생성됨' })
  @ApiBody({
    type: CreateMatchingRoomDto,
    description: '매칭된 두 사용자의 ID',
    examples: {
      example1: {
        value: {
          user1Id: '',
          user2Id: '',
        },
      },
    },
  })
  @Post('matchingRooms')
  async createMatchingRoom(@Body() body: CreateMatchingRoomDto) {
    return this.chatService.createMatchingRoom(body.user1Id, body.user2Id);
  }

  @ApiOperation({
    summary: '대화방 버튼 클릭 시 채팅방 입장',
    description:
      '채팅 페이지에서 대화방 버튼을 클릭하면 호출됩니다. 기존 채팅방이 있으면 해당 채팅방을 반환하고, 없으면 새로 생성합니다.',
  })
  @ApiResponse({ status: 200, description: '채팅방 입장 성공' })
  @ApiBody({
    type: FindOrCreateChatRoomDto,
    description: '채팅방 상대방 사용자 ID',
    examples: {
      example1: {
        value: {
          partnerId: 'user-uuid',
        },
      },
    },
  })
  @Post('chatRooms/findOrCreate')
  async findOrCreateChatRoom(
    @UserId() user: User,
    @Body() body: FindOrCreateChatRoomDto,
  ) {
    return this.chatService.findOrCreateChatRoom(user.id, body.partnerId);
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

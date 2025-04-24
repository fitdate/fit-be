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
    summary: '채팅방 목록 조회',
    description: '사용자가 참여한 채팅방 목록을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '채팅방 목록 조회 성공' })
  @Get('chatRooms')
  async getRooms(@UserId() userId: string) {
    return this.chatService.getRooms(userId);
  }

  @ApiOperation({
    summary: '채팅방 상세 정보 조회',
    description: '특정 채팅방의 상세 정보를 조회합니다.',
  })
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

  @ApiOperation({
    summary: '채팅방 입장 알림 전송',
    description: '채팅방에 입장할 때 상대방에게 알림을 보냅니다.',
  })
  @ApiResponse({ status: 200, description: '알림 전송 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @Post('chatRooms/:chatRoomId/enter')
  async enterChatRoom(
    @UserId() user: User,
    @Param('chatRoomId') chatRoomId: string,
    @Body() body: { opponentId: string },
  ) {
    return this.chatService.sendChatRoomEntryNotification(
      chatRoomId,
      user.id,
      body.opponentId,
    );
  }

  @ApiOperation({ summary: '채팅방 입장' })
  @ApiResponse({ status: 200, description: '채팅방 입장 성공' })
  @Post('chatRooms/:chatRoomId/enter')
  async enterRoom(
    @UserId() user: User,
    @Param('chatRoomId') chatRoomId: string,
  ) {
    return this.chatService.enterRoom(chatRoomId, user.id);
  }

  @ApiOperation({
    summary: '대화방 버튼 클릭 시 채팅방 입장',
    description:
      '채팅 페이지에서 대화방 버튼을 클릭하면 호출됩니다. 기존 채팅방이 있으면 해당 채팅방을 반환하고, 없으면 새로 생성합니다.',
  })
  @ApiResponse({ status: 200, description: '채팅방 입장 성공' })
  @Post('chatRooms/findOrCreate')
  async findOrCreateChatRoom(
    @UserId() user: User,
    @Body() body: { opponentId: string },
  ) {
    return this.chatService.findOrCreateChatRoom(user.id, body.opponentId);
  }

  @ApiOperation({
    summary: '알림 메시지의 채팅하기 버튼 클릭 시 채팅방 입장',
    description:
      '매칭 알림의 채팅하기 버튼을 클릭하면 호출됩니다. 기존 채팅방이 있으면 해당 채팅방을 반환하고, 없으면 새로 생성합니다.',
  })
  @ApiResponse({ status: 200, description: '채팅방 입장 성공' })
  @Post('chatRooms/fromNotification')
  async createChatRoomFromNotification(
    @UserId() user: User,
    @Body() body: { opponentId: string },
  ) {
    return this.chatService.createChatRoomFromNotification(
      user.id,
      body.opponentId,
    );
  }
}

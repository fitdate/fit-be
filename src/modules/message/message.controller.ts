import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';

@ApiTags('messages')
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @ApiOperation({
    summary: '메시지 생성',
    description: '새로운 메시지를 생성합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '메시지가 성공적으로 생성되었습니다.',
  })
  @ApiResponse({ status: 403, description: '채팅방 참여자가 아닙니다.' })
  create(@Body() createMessageDto: CreateMessageDto) {
    return this.messageService.create(
      createMessageDto.chatRoomId,
      createMessageDto.senderId,
      createMessageDto.content,
    );
  }

  @Get('chat-room/:chatRoomId')
  @ApiOperation({
    summary: '채팅방 메시지 조회',
    description: '특정 채팅방의 모든 메시지를 조회합니다.',
  })
  @ApiParam({ name: 'chatRoomId', description: '채팅방 ID' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '커서 (마지막 메시지의 createdAt_id)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '페이지당 항목 수 (기본값: 50)',
  })
  @ApiResponse({
    status: 200,
    description: '메시지 목록이 성공적으로 조회되었습니다.',
  })
  findAll(
    @Param('chatRoomId') chatRoomId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.messageService.findAll(chatRoomId, cursor, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: '메시지 상세 조회',
    description: '특정 메시지의 상세 정보를 조회합니다.',
  })
  @ApiParam({ name: 'id', description: '메시지 ID' })
  @ApiResponse({
    status: 200,
    description: '메시지가 성공적으로 조회되었습니다.',
  })
  @ApiResponse({ status: 400, description: '메시지를 찾을 수 없습니다.' })
  findOne(@Param('id') id: string) {
    return this.messageService.findOne(id);
  }

  @Post('read')
  @ApiOperation({
    summary: '메시지 읽음 표시',
    description: '여러 메시지를 한 번에 읽음으로 표시합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '메시지들이 성공적으로 읽음으로 표시되었습니다.',
  })
  markAsRead(
    @Body('messageIds') messageIds: string[],
    @Body('userId') userId: string,
  ) {
    return this.messageService.markAsRead(messageIds, userId);
  }

  @Get('chat-room/:chatRoomId/search')
  @ApiOperation({
    summary: '메시지 검색',
    description: '채팅방 내에서 메시지를 검색합니다.',
  })
  @ApiParam({ name: 'chatRoomId', description: '채팅방 ID' })
  @ApiQuery({ name: 'keyword', description: '검색 키워드' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '커서 (마지막 메시지의 createdAt_id)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '페이지당 항목 수 (기본값: 50)',
  })
  @ApiResponse({
    status: 200,
    description: '검색 결과가 성공적으로 조회되었습니다.',
  })
  search(
    @Param('chatRoomId') chatRoomId: string,
    @Query('keyword') keyword: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.messageService.search(chatRoomId, keyword, cursor, limit);
  }
}

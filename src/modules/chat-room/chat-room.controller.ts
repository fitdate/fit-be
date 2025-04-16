import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  ValidationPipe,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatRoomService } from './chat-room.service';
import { UserService } from '../user/user.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { UpdateChatRoomDto } from './dto/update-chat-room.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
import { ChatRoom } from './entities/chat-room.entity';
import { RequestWithAuth } from '../auth/types/auth-guard.types';

@ApiTags('채팅방')
@Controller('chat-rooms')
export class ChatRoomController {
  constructor(
    private readonly chatRoomService: ChatRoomService,
    private readonly userService: UserService,
  ) {}

  @ApiBearerAuth()
  @Post()
  async create(
    @Body(ValidationPipe) createChatRoomDto: CreateChatRoomDto,
    @Req() req: RequestWithAuth,
  ) {
    if (!req.user) {
      throw new ForbiddenException(
        '인증된 사용자만 채팅방을 생성할 수 있습니다.',
      );
    }

    const user = await this.userService.findOne(req.user.sub.toString());
    if (!user) {
      throw new ForbiddenException('사용자를 찾을 수 없습니다.');
    }

    const uniqueParticipants = Array.from(
      new Set([...createChatRoomDto.participants, user.id]),
    );

    return this.chatRoomService.create(
      createChatRoomDto.title,
      uniqueParticipants,
    );
  }

  @ApiOperation({
    summary: '채팅방 목록 조회',
    description: '활성화된 모든 채팅방을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '채팅방 목록 조회 성공',
    type: [ChatRoom],
  })
  @ApiBearerAuth()
  @Get()
  findAll(@Query('cursor') cursor?: string, @Query('limit') limit?: number) {
    return this.chatRoomService.findAll(cursor, limit);
  }

  @ApiOperation({
    summary: '채팅방 상세 조회',
    description: '특정 채팅방의 정보를 조회합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '채팅방 조회 성공', type: ChatRoom })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatRoomService.findOne(id);
  }

  @ApiOperation({
    summary: '채팅방 수정',
    description: '채팅방 정보를 수정합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '채팅방 수정 성공', type: ChatRoom })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  @ApiBearerAuth()
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateChatRoomDto: UpdateChatRoomDto,
    @Req() req: RequestWithAuth,
  ) {
    if (!req.user) {
      throw new ForbiddenException(
        '인증된 사용자만 채팅방을 수정할 수 있습니다.',
      );
    }

    const user = await this.userService.findOne(req.user.sub.toString());
    if (!user) {
      throw new ForbiddenException('사용자를 찾을 수 없습니다.');
    }

    return this.chatRoomService.update(id, updateChatRoomDto.title);
  }

  @ApiOperation({
    summary: '채팅방 삭제',
    description: '채팅방을 비활성화합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '채팅방 삭제 성공' })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithAuth) {
    if (!req.user) {
      throw new ForbiddenException(
        '인증된 사용자만 채팅방을 삭제할 수 있습니다.',
      );
    }

    const user = await this.userService.findOne(req.user.sub.toString());
    if (!user) {
      throw new ForbiddenException('사용자를 찾을 수 없습니다.');
    }

    return this.chatRoomService.remove(id);
  }

  @ApiOperation({
    summary: '참여자 추가',
    description: '채팅방에 새로운 참여자를 추가합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '참여자 추가 성공', type: ChatRoom })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  @ApiResponse({ status: 400, description: '이미 존재하는 참여자' })
  @ApiBearerAuth()
  @Post(':id/participants')
  async addParticipant(
    @Param('id') id: string,
    @Body(ValidationPipe) addParticipantDto: AddParticipantDto,
    @Req() req: RequestWithAuth,
  ) {
    if (!req.user) {
      throw new ForbiddenException(
        '인증된 사용자만 참여자를 추가할 수 있습니다.',
      );
    }

    const user = await this.userService.findOne(req.user.sub.toString());
    if (!user) {
      throw new ForbiddenException('사용자를 찾을 수 없습니다.');
    }

    return this.chatRoomService.addParticipant(id, addParticipantDto.userId);
  }

  @ApiOperation({
    summary: '참여자 제거',
    description: '채팅방에서 참여자를 제거합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiParam({ name: 'userId', description: '제거할 사용자 ID' })
  @ApiResponse({ status: 200, description: '참여자 제거 성공', type: ChatRoom })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  @ApiResponse({ status: 400, description: '존재하지 않는 참여자' })
  @ApiBearerAuth()
  @Delete(':id/participants/:userId')
  async removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: RequestWithAuth,
  ) {
    if (!req.user) {
      throw new ForbiddenException(
        '인증된 사용자만 참여자를 제거할 수 있습니다.',
      );
    }

    const user = await this.userService.findOne(req.user.sub.toString());
    if (!user) {
      throw new ForbiddenException('사용자를 찾을 수 없습니다.');
    }

    return this.chatRoomService.removeParticipant(id, userId);
  }
}

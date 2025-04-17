import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { ChatRoomService } from '../chat-room/chat-room.service';
import { MessageResponseDto } from './dto/message-response.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly chatRoomService: ChatRoomService,
  ) {}

  private toMessageResponseDto(
    message: Message,
    currentUserId: string,
  ): MessageResponseDto {
    return {
      ...message,
      isMine: message.senderId === currentUserId,
    };
  }

  // 새로운 메시지를 생성하고 저장
  async create(
    chatRoomId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'emoji' = 'text',
    fileUrl?: string,
  ): Promise<MessageResponseDto> {
    const chatRoom = await this.chatRoomService.findOne(chatRoomId);
    if (!chatRoom.users.some((user) => user.id === senderId)) {
      throw new ForbiddenException('채팅방 참여자가 아닙니다');
    }

    const message = this.messageRepository.create({
      content,
      senderId,
      chatRoomId,
      type,
      fileUrl,
      isRead: false,
    });
    const savedMessage = await this.messageRepository.save(message);
    return this.toMessageResponseDto(savedMessage, senderId);
  }

  // 특정 채팅방의 메시지 목록을 조회
  async findAll(
    chatRoomId: string,
    currentUserId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<{ messages: MessageResponseDto[]; nextCursor: string | null }> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.chatRoomId = :chatRoomId', { chatRoomId })
      .orderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(limit + 1);

    if (cursor) {
      const [createdAt, id] = cursor.split('_');
      queryBuilder.andWhere(
        '(message.createdAt < :createdAt OR (message.createdAt = :createdAt AND message.id < :id))',
        { createdAt, id },
      );
    }

    const messages = await queryBuilder.getMany();
    const hasNextPage = messages.length > limit;
    const items = hasNextPage ? messages.slice(0, -1) : messages;

    if (items.length === 0) {
      return { messages: [], nextCursor: null };
    }

    const lastItem = items[items.length - 1];
    if (!lastItem?.createdAt || !lastItem?.id) {
      return {
        messages: items.map((message) =>
          this.toMessageResponseDto(message, currentUserId),
        ),
        nextCursor: null,
      };
    }

    const nextCursor = hasNextPage
      ? `${lastItem.createdAt.toISOString()}_${lastItem.id}`
      : null;

    return {
      messages: items.map((message) =>
        this.toMessageResponseDto(message, currentUserId),
      ),
      nextCursor,
    };
  }

  // 특정 메시지의 상세 정보를 조회
  async findOne(
    id: string,
    currentUserId: string,
  ): Promise<MessageResponseDto> {
    const message = await this.messageRepository.findOne({ where: { id } });
    if (!message) {
      throw new BadRequestException('메시지를 찾을 수 없습니다');
    }
    return this.toMessageResponseDto(message, currentUserId);
  }

  // 여러 메시지를 한 번에 읽음으로 표시
  async markAsRead(messageIds: string[], userId: string): Promise<void> {
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('id IN (:...messageIds)', { messageIds })
      .andWhere('senderId != :userId', { userId })
      .execute();
  }

  // 채팅방 내에서 메시지를 검색
  async search(
    chatRoomId: string,
    currentUserId: string,
    keyword: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<{ messages: MessageResponseDto[]; nextCursor: string | null }> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.chatRoomId = :chatRoomId', { chatRoomId })
      .andWhere('message.content ILIKE :keyword', { keyword: `%${keyword}%` })
      .orderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(limit + 1);

    if (cursor) {
      const [createdAt, id] = cursor.split('_');
      queryBuilder.andWhere(
        '(message.createdAt < :createdAt OR (message.createdAt = :createdAt AND message.id < :id))',
        { createdAt, id },
      );
    }

    const messages = await queryBuilder.getMany();
    const hasNextPage = messages.length > limit;
    const items = hasNextPage ? messages.slice(0, -1) : messages;

    if (items.length === 0) {
      return { messages: [], nextCursor: null };
    }

    const lastItem = items[items.length - 1];
    if (!lastItem?.createdAt || !lastItem?.id) {
      return {
        messages: items.map((message) =>
          this.toMessageResponseDto(message, currentUserId),
        ),
        nextCursor: null,
      };
    }

    const nextCursor = hasNextPage
      ? `${lastItem.createdAt.toISOString()}_${lastItem.id}`
      : null;

    return {
      messages: items.map((message) =>
        this.toMessageResponseDto(message, currentUserId),
      ),
      nextCursor,
    };
  }

  // 채팅방의 메시지 히스토리를 조회
  async getHistory(
    chatRoomId: string,
    currentUserId: string,
    before?: string,
    after?: string,
    limit: number = 50,
  ): Promise<{ messages: MessageResponseDto[]; total: number }> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.chatRoomId = :chatRoomId', { chatRoomId });

    if (before) {
      queryBuilder.andWhere('message.id < :before', { before });
    }
    if (after) {
      queryBuilder.andWhere('message.id > :after', { after });
    }

    const [messages, total] = await queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .take(limit)
      .getManyAndCount();

    return {
      messages: messages.map((message) =>
        this.toMessageResponseDto(message, currentUserId),
      ),
      total,
    };
  }
}

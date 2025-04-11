import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';

@Injectable()
export class ChatRoomService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
  ) {}

  // 새로운 채팅방을 생성하고 기본적으로 활성화 상태로 설정
  async create(title: string, participants: string[]): Promise<ChatRoom> {
    const chatRoom = this.chatRoomRepository.create({
      title,
      participants,
      isActive: true,
    });
    const savedChatRoom = await this.chatRoomRepository.save(chatRoom);

    return {
      id: savedChatRoom.id,
      title: savedChatRoom.title,
      participants: savedChatRoom.participants,
      createdAt: savedChatRoom.createdAt,
    } as ChatRoom;
  }

  // isActive가 true인 채팅방만 조회
  async findAll(
    cursor?: string,
    limit: number = 20,
  ): Promise<{
    items: ChatRoom[];
    nextCursor: string | null;
  }> {
    const query = this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .select([
        'chatRoom.id',
        'chatRoom.title',
        'chatRoom.participants',
        'chatRoom.createdAt',
      ])
      .where('chatRoom.isActive = :isActive', { isActive: true })
      .orderBy('chatRoom.createdAt', 'DESC')
      .addOrderBy('chatRoom.id', 'DESC')
      .take(limit + 1); // 다음 페이지 존재 여부 확인을 위해 +1

    if (cursor) {
      const [createdAt, id] = cursor.split('_');
      query.andWhere(
        '(chatRoom.createdAt < :createdAt OR (chatRoom.createdAt = :createdAt AND chatRoom.id < :id))',
        { createdAt, id },
      );
    }

    const chatRooms = await query.getMany();

    const hasNextPage = chatRooms.length > limit;
    const items = hasNextPage ? chatRooms.slice(0, -1) : chatRooms;

    if (items.length === 0) {
      return { items: [], nextCursor: null };
    }

    const lastItem = items[items.length - 1];
    if (!lastItem?.createdAt || !lastItem?.id) {
      return { items, nextCursor: null };
    }

    const nextCursor = hasNextPage
      ? `${lastItem.createdAt.toISOString()}_${lastItem.id}`
      : null;

    return {
      items,
      nextCursor,
    };
  }

  // ID로 채팅방을 찾고, 없으면 NotFoundException 발생
  async findOne(id: string): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id, isActive: true },
      select: {
        id: true,
        title: true,
        participants: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!chatRoom) {
      throw new NotFoundException(`채팅방을 찾을 수 없습니다. (ID: ${id})`);
    }
    return chatRoom;
  }

  // 채팅방의 제목과 참여자 목록을 업데이트
  async update(
    id: string,
    title: string,
    participants: string[],
  ): Promise<ChatRoom> {
    const chatRoom = await this.findOne(id);
    chatRoom.title = title;
    chatRoom.participants = participants;
    const updatedChatRoom = await this.chatRoomRepository.save(chatRoom);

    return {
      id: updatedChatRoom.id,
      title: updatedChatRoom.title,
      participants: updatedChatRoom.participants,
      updatedAt: updatedChatRoom.updatedAt,
    } as ChatRoom;
  }

  // 채팅방을 완전히 삭제하지 않고 isActive를 false로 설정
  async remove(id: string): Promise<void> {
    const chatRoom = await this.findOne(id);
    chatRoom.isActive = false;
    await this.chatRoomRepository.save(chatRoom);
  }

  // 이미 참여 중인 사용자인 경우 BadRequestException 발생
  async addParticipant(id: string, userId: string): Promise<ChatRoom> {
    const result = (await this.chatRoomRepository
      .createQueryBuilder()
      .update(ChatRoom)
      .set({ participants: () => `array_append(participants, :userId)` })
      .where('id = :id', { id })
      .andWhere('isActive = :isActive', { isActive: true })
      .andWhere('NOT participants @> ARRAY[:userId]', { userId })
      .setParameter('userId', userId)
      .returning('*')
      .execute()) as { affected: number; raw: ChatRoom[] };

    if (result.affected === 0) {
      throw new BadRequestException('이미 채팅방에 참여 중인 사용자입니다.');
    }

    const updatedChatRoom = result.raw[0];
    return {
      ...updatedChatRoom,
      isActive: true,
      messages: [],
    };
  }

  // 존재하지 않는 참여자인 경우 BadRequestException 발생
  async removeParticipant(id: string, userId: string): Promise<ChatRoom> {
    const result = (await this.chatRoomRepository
      .createQueryBuilder()
      .update(ChatRoom)
      .set({ participants: () => `array_remove(participants, :userId)` })
      .where('id = :id', { id })
      .andWhere('isActive = :isActive', { isActive: true })
      .andWhere('participants @> ARRAY[:userId]', { userId })
      .setParameter('userId', userId)
      .returning('*')
      .execute()) as { affected: number; raw: ChatRoom[] };

    if (result.affected === 0) {
      throw new BadRequestException('채팅방에 존재하지 않는 사용자입니다.');
    }

    const updatedChatRoom = result.raw[0];
    return {
      ...updatedChatRoom,
      isActive: true,
      messages: [],
    };
  }
}

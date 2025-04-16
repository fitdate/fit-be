import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class ChatRoomService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 새로운 채팅방을 생성하고 기본적으로 활성화 상태로 설정
  async create(title: string, participantIds: string[]): Promise<ChatRoom> {
    // 참여자 조회
    const users = await Promise.all(
      participantIds.map(async (userId) => {
        const user = await this.userRepository.findOne({
          where: { id: userId },
        });
        if (!user) {
          throw new NotFoundException(
            `사용자를 찾을 수 없습니다. (ID: ${userId})`,
          );
        }
        return user;
      }),
    );

    const chatRoom = this.chatRoomRepository.create({
      title,
      isActive: true,
      users,
    });

    return await this.chatRoomRepository.save(chatRoom);
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
      .select(['chatRoom.id', 'chatRoom.title', 'chatRoom.createdAt'])
      .where('chatRoom.isActive = :isActive', { isActive: true })
      .orderBy('chatRoom.createdAt', 'DESC')
      .addOrderBy('chatRoom.id', 'DESC')
      .take(limit + 1);

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
      relations: ['users'],
    });
    if (!chatRoom) {
      throw new NotFoundException(`채팅방을 찾을 수 없습니다. (ID: ${id})`);
    }
    return chatRoom;
  }

  // 채팅방의 제목을 업데이트
  async update(id: string, title: string): Promise<ChatRoom> {
    const chatRoom = await this.findOne(id);
    chatRoom.title = title;
    return await this.chatRoomRepository.save(chatRoom);
  }

  // 채팅방을 완전히 삭제하지 않고 isActive를 false로 설정
  async remove(id: string): Promise<void> {
    const chatRoom = await this.findOne(id);
    chatRoom.isActive = false;
    await this.chatRoomRepository.save(chatRoom);
  }

  // 참여자 추가
  async addParticipant(id: string, userId: string): Promise<ChatRoom> {
    const chatRoom = await this.findOne(id);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`사용자를 찾을 수 없습니다. (ID: ${userId})`);
    }

    // 이미 참여 중인지 확인
    const isAlreadyParticipant = chatRoom.users.some(
      (participant) => participant.id === userId,
    );
    if (isAlreadyParticipant) {
      throw new BadRequestException('이미 채팅방에 참여 중인 사용자입니다.');
    }

    // 참여자 추가
    chatRoom.users.push(user);
    return await this.chatRoomRepository.save(chatRoom);
  }

  // 참여자 제거
  async removeParticipant(id: string, userId: string): Promise<ChatRoom> {
    const chatRoom = await this.findOne(id);

    // 참여 중인지 확인
    const participantIndex = chatRoom.users.findIndex(
      (user) => user.id === userId,
    );
    if (participantIndex === -1) {
      throw new BadRequestException('채팅방에 존재하지 않는 사용자입니다.');
    }

    // 참여자 제거
    chatRoom.users.splice(participantIndex, 1);
    return await this.chatRoomRepository.save(chatRoom);
  }
}

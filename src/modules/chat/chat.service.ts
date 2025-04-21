import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 새로운 채팅방을 생성합니다.
   * @param chatName 채팅방 이름
   * @returns 생성된 채팅방 정보
   */
  async createRoom(chatName: string) {
    const chatRoom = this.chatRoomRepository.create({ name: chatName });
    return await this.chatRoomRepository.save(chatRoom);
  }

  /**
   * 모든 채팅방 목록을 조회합니다.
   * @returns 채팅방 목록
   */
  async getRooms() {
    return await this.chatRoomRepository.find();
  }

  /**
   * 특정 채팅방의 상세 정보를 조회합니다.
   * @param chatRoomId 조회할 채팅방 ID
   * @returns 채팅방 정보
   */
  async getRoom(chatRoomId: string) {
    return await this.chatRoomRepository.findOne({ where: { id: chatRoomId } });
  }

  /**
   * 특정 채팅방의 참여자 목록을 조회합니다.
   * @param chatRoomId 조회할 채팅방 ID
   * @returns 채팅방 참여자 목록
   */
  async getRoomUsers(chatRoomId: string) {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['users'],
    });
    return chatRoom?.users || [];
  }

  /**
   * 채팅 메시지를 조회합니다.
   * @param chatRoomId 특정 채팅방의 메시지만 조회할 경우 채팅방 ID
   * @returns 채팅 메시지 목록
   */
  async getMessages(chatRoomId?: string) {
    const query = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.user', 'user')
      .orderBy('message.createdAt', 'DESC');

    if (chatRoomId) {
      query.where('message.chatRoomId = :chatRoomId', { chatRoomId });
    }

    return await query.getMany();
  }

  /**
   * 사용자가 채팅방에서 나갑니다.
   * @param chatRoomId 나갈 채팅방 ID
   * @param userId 나가는 사용자 ID
   * @returns 성공 여부
   */
  async exitRoom(chatRoomId: string, userId: string) {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['users'],
    });

    if (!chatRoom) {
      throw new Error('채팅방을 찾을 수 없습니다.');
    }

    chatRoom.users = chatRoom.users.filter((user) => user.id !== userId);
    await this.chatRoomRepository.save(chatRoom);
    return { success: true };
  }

  /**
   * 새로운 채팅 메시지를 저장합니다.
   * @param content 메시지 내용
   * @param user 메시지를 보낸 사용자
   * @param chatRoomId 메시지를 보낼 채팅방 ID
   * @returns 저장된 메시지 정보
   */
  async saveMessage(content: string, user: User, chatRoomId?: string) {
    const message = this.messageRepository.create({
      content,
      user,
      chatRoomId,
    });
    return await this.messageRepository.save(message);
  }

  /**
   * 시스템 메시지를 저장합니다.
   * @param content 시스템 메시지 내용
   * @returns 저장된 시스템 메시지 정보
   */
  async saveSystemMessage(content: string) {
    const systemUser = await this.userRepository.findOne({
      where: { name: 'System' },
    });
    if (!systemUser) {
      throw new Error('시스템 사용자를 찾을 수 없습니다.');
    }
    const message = this.messageRepository.create({
      content,
      user: systemUser,
      isSystem: true,
    });
    return await this.messageRepository.save(message);
  }
}

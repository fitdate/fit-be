import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { UpdateChatRoomDto } from './dto/update-chat-room.dto';

@Injectable()
export class ChatRoomService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
  ) {}

  async create(createChatRoomDto: CreateChatRoomDto): Promise<ChatRoom> {
    const chatRoom = this.chatRoomRepository.create(createChatRoomDto);
    return this.chatRoomRepository.save(chatRoom);
  }

  async findAll(): Promise<ChatRoom[]> {
    return this.chatRoomRepository.find();
  }

  async findOne(id: string): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomRepository.findOne({ where: { id } });
    if (!chatRoom) {
      throw new NotFoundException(`ChatRoom with ID ${id} not found`);
    }
    return chatRoom;
  }

  async update(
    id: string,
    updateChatRoomDto: UpdateChatRoomDto,
  ): Promise<ChatRoom> {
    await this.chatRoomRepository.update(id, updateChatRoomDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.chatRoomRepository.delete(id);
  }
}

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from '../message/message.service';
import { ChatRoomService } from './chat-room.service';
import { JoinRoomData, TypingData, Response } from './types/chat-room.types';
import {
  SendMessageData,
  MessageReadData,
  SearchMessageData,
  MessageHistoryData,
} from '../message/types/message.types';

/**
 * WebSocket을 통한 실시간 채팅 기능을 제공하는 게이트웨이
 *
 * 주요 기능:
 * - 실시간 메시지 송수신
 * - 채팅방 입장/퇴장 관리
 * - 타이핑 상태 표시
 * - 메시지 읽음 처리
 * - 메시지 검색 및 히스토리 조회
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class ChatRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Set<string>> = new Map();
  private readonly CLEANUP_INTERVAL = 30 * 60 * 1000; // 30분

  constructor(
    private readonly messageService: MessageService,
    private readonly chatRoomService: ChatRoomService,
  ) {
    // 주기적으로 연결되지 않은 클라이언트 정리
    setInterval(() => this.cleanupDisconnectedClients(), this.CLEANUP_INTERVAL);
  }

  private cleanupDisconnectedClients() {
    for (const [roomId, clients] of this.connectedClients.entries()) {
      if (clients.size === 0) {
        this.connectedClients.delete(roomId);
      }
    }
  }

  private handleError(error: unknown): Response<any> {
    const errorMessage =
      error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했습니다.';
    return { success: false, error: errorMessage };
  }

  handleConnection(client: Socket) {
    void console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    void console.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  // 채팅방 입장 처리
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    client: Socket,
    data: JoinRoomData,
  ): Promise<Response<void>> {
    try {
      const roomClients = this.connectedClients.get(data.roomId) || new Set();
      if (!roomClients.has(data.userId)) {
        const chatRoom = await this.chatRoomService.findOne(data.roomId);
        if (!chatRoom.users.some((user) => user.id === data.userId)) {
          throw new Error('채팅방 참여자가 아닙니다.');
        }
        roomClients.add(data.userId);
        this.connectedClients.set(data.roomId, roomClients);
      }

      await client.join(data.roomId);
      return { success: true };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 채팅방 퇴장 처리
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    client: Socket,
    roomId: string,
  ): Promise<Response<void>> {
    await client.leave(roomId);
    const roomClients = this.connectedClients.get(roomId);
    if (roomClients) {
      roomClients.delete(client.id);
      if (roomClients.size === 0) {
        this.connectedClients.delete(roomId);
      }
    }
    return { success: true };
  }

  // 메시지 전송 처리
  @SubscribeMessage('sendMessage')
  async handleMessage(
    client: Socket,
    data: SendMessageData,
  ): Promise<Response<any>> {
    try {
      const message = await this.messageService.create(
        data.roomId,
        data.senderId,
        data.content,
        data.type || 'text',
        data.fileUrl,
      );

      const roomClients = this.connectedClients.get(data.roomId);
      if (roomClients) {
        roomClients.forEach((userId) => {
          if (userId !== data.senderId) {
            this.server.to(userId).emit('newMessage', message);
          }
        });
      }

      return { success: true, data: message };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 타이핑 상태 전송
  @SubscribeMessage('typing')
  handleTyping(client: Socket, data: TypingData): Response<void> {
    const roomClients = this.connectedClients.get(data.roomId);
    if (roomClients) {
      roomClients.forEach((userId) => {
        if (userId !== data.userId) {
          this.server.to(userId).emit('userTyping', { userId: data.userId });
        }
      });
    }
    return { success: true };
  }

  // 타이핑 중단 상태 전송
  @SubscribeMessage('stopTyping')
  handleStopTyping(client: Socket, data: TypingData): Response<void> {
    const roomClients = this.connectedClients.get(data.roomId);
    if (roomClients) {
      roomClients.forEach((userId) => {
        if (userId !== data.userId) {
          this.server
            .to(userId)
            .emit('userStoppedTyping', { userId: data.userId });
        }
      });
    }
    return { success: true };
  }

  // 메시지 읽음 처리
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    client: Socket,
    data: MessageReadData,
  ): Promise<Response<void>> {
    try {
      await this.messageService.markAsRead([data.messageId], data.userId);
      return { success: true };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 메시지 검색
  @SubscribeMessage('searchMessages')
  async handleSearchMessages(
    client: Socket,
    data: SearchMessageData,
  ): Promise<Response<any>> {
    try {
      const messages = await this.messageService.search(
        data.roomId,
        data.keyword,
        data.cursor,
        data.limit,
      );
      return { success: true, data: messages };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 메시지 히스토리 조회
  @SubscribeMessage('getMessageHistory')
  async handleGetMessageHistory(
    client: Socket,
    data: MessageHistoryData,
  ): Promise<Response<any>> {
    try {
      const messages = await this.messageService.getHistory(
        data.roomId,
        data.before,
        data.after,
        data.limit,
      );
      return { success: true, data: messages };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

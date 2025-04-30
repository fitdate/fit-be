import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UserService } from '../user/user.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling'], // 추가
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
  ) {}

  // 사용자 로그인을 처리하고 시스템 메시지를 전송
  @SubscribeMessage('login')
  async handleLogin(client: Socket, userName: string) {
    try {
      const user = await this.userService.saveUser(userName, client.id);
      const welcomeMessage = await this.chatService.saveSystemMessage(
        `${user.name}님이 채팅방에 입장하셨습니다.`,
      );
      this.server.emit('message', welcomeMessage);
      return { ok: true, data: user };
    } catch (error: unknown) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }

  // 사용자가 채팅방에 참여할 때 호출
  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string; userId: string },
  ) {
    try {
      const hasAccess = await this.chatService.validateChatRoomAccess(
        data.userId,
        data.chatRoomId,
      );

      if (!hasAccess) {
        throw new Error('채팅방 접근 권한이 없습니다.');
      }

      await client.join(data.chatRoomId);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }

  // 채팅 메시지를 처리하고 채팅방의 모든 사용자에게 전송
  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { content: string; userId: string; chatRoomId: string },
  ) {
    try {
      const message = await this.chatService.sendMessage(
        data.content,
        data.userId,
        data.chatRoomId,
      );

      this.server.to(data.chatRoomId).emit('message', message);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }
}

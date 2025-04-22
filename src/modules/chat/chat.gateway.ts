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
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
  ) {}

  // 사용자 로그인 처리
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

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string; userId: string },
  ) {
    try {
      // 채팅방 접근 권한 확인
      const hasAccess = await this.chatService.validateChatRoomAccess(
        data.userId,
        data.chatRoomId,
      );

      if (!hasAccess) {
        throw new Error('채팅방 접근 권한이 없습니다.');
      }

      // 소켓 룸 참여
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

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { content: string; userId: string; chatRoomId: string },
  ) {
    try {
      // 메시지 전송
      const message = await this.chatService.sendMessage(
        data.content,
        data.userId,
        data.chatRoomId,
      );

      // 채팅방의 모든 클라이언트에게 메시지 전송
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

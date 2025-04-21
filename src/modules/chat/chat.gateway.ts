import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UserService } from '../user/user.service';

@WebSocketGateway({
  cors: {
    origin: 'https://fit-date.co.kr',
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

  // 메시지 전송 처리
  @SubscribeMessage('sendMessage')
  async handleMessage(
    client: Socket,
    data: { message: string; chatRoomId?: string },
  ) {
    try {
      const user = await this.userService.checkUser(client.id);
      const newMessage = await this.chatService.saveMessage(
        data.message,
        user,
        data.chatRoomId,
      );
      this.server.emit('message', newMessage);
      return { ok: true };
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
}

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';
import { Notification } from './types/notification.types';

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private clients = new Map<string, Subject<MessageEvent>>();

  constructor() {}

  // 클라이언트 추가
  addClient(userId: string): Subject<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.clients.set(userId, subject);
    this.logger.log(`Client ${userId} connected`);
    return subject;
  }

  // 클라이언트 제거
  removeClient(userId: string) {
    const client = this.clients.get(userId);
    if (client) {
      client.complete();
      this.clients.delete(userId);
      this.logger.log(`Client ${userId} disconnected`);
    }
  }

  // 클라이언트 조회
  getClients() {
    this.logger.log(`Clients: ${JSON.stringify(this.clients)}`);
    return this.clients;
  }

  // 알림 전송
  sendNotification(userId: string, notification: Notification) {
    const client = this.clients.get(userId);
    if (client) {
      client.next({ data: notification } as MessageEvent);
    }
  }
}

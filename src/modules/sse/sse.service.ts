import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';
import { NotificationDto } from './types/notification.types';

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private clients = new Map<string, Subject<MessageEvent>>();

  constructor() {
    this.clients = new Map<string, Subject<MessageEvent>>();
  }

  addClient(userId: string): Subject<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.clients.set(userId, subject);
    this.logger.log(`Client ${userId} connected`);
    return subject;
  }

  removeClient(userId: string) {
    const client = this.clients.get(userId);
    if (client) {
      client.complete();
      this.clients.delete(userId);
      this.logger.log(`Client ${userId} disconnected`);
    }
  }

  getClients() {
    this.logger.log(`Clients: ${JSON.stringify(this.clients)}`);
    return this.clients;
  }

  sendNotification(userId: string, notification: NotificationDto) {
    const client = this.clients.get(userId);
    if (client) {
      client.next({ data: notification } as MessageEvent);
    }
  }
}

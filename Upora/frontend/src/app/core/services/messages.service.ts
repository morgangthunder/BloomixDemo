import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface CreateMessageDto {
  toUserId: string;
  title: string;
  body: string;
  /** Default true. When true, save in-app notification and emit real-time. */
  sendInApp?: boolean;
  /** Default false. When true, trigger N8N webhook to send email (if configured). */
  sendEmail?: boolean;
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
  fromUser?: {
    id: string;
    email: string;
    username?: string;
  };
  toUser?: {
    id: string;
    email: string;
    username?: string;
  };
}

export interface MessagesResponse {
  sent: Message[];
  received: Message[];
}

@Injectable({ providedIn: 'root' })
export class MessagesService {
  constructor(private api: ApiService) {}

  createMessage(dto: CreateMessageDto): Observable<Message> {
    return this.api.post<Message>('/messages', dto);
  }

  getMessages(): Observable<MessagesResponse> {
    return this.api.get<MessagesResponse>('/messages');
  }

  markAsRead(messageId: string): Observable<Message> {
    return this.api.patch<Message>(`/messages/${messageId}/read`, {});
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.api.get<{ count: number }>('/messages/unread-count');
  }
}

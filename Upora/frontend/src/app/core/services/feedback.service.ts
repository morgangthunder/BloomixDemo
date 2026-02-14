import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FeedbackItem {
  id: string;
  userId: string;
  subject: string;
  body: string;
  status: 'pending' | 'replied' | 'addressed' | 'wont_do' | 'archived';
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string; username?: string };
  replies?: FeedbackReply[];
}

export interface FeedbackReply {
  id: string;
  feedbackId: string;
  fromUserId: string;
  body: string;
  createdAt: string;
  fromUser?: { id: string; email: string; username?: string };
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly base = '/api/feedback';
  private readonly adminBase = '/api/super-admin/feedback';

  constructor(private http: HttpClient) {}

  // ── User-facing ────────────────────────────────────────────────────

  submit(subject: string, body: string): Observable<FeedbackItem> {
    return this.http.post<FeedbackItem>(this.base, { subject, body });
  }

  getMine(): Observable<FeedbackItem[]> {
    return this.http.get<FeedbackItem[]>(`${this.base}/mine`);
  }

  getThread(feedbackId: string): Observable<FeedbackItem> {
    return this.http.get<FeedbackItem>(`${this.base}/${feedbackId}/thread`);
  }

  reply(feedbackId: string, body: string): Observable<FeedbackReply> {
    return this.http.post<FeedbackReply>(`${this.base}/${feedbackId}/reply`, { body });
  }

  // ── Super-admin ────────────────────────────────────────────────────

  getAll(): Observable<FeedbackItem[]> {
    return this.http.get<FeedbackItem[]>(this.adminBase);
  }

  getArchived(): Observable<FeedbackItem[]> {
    return this.http.get<FeedbackItem[]>(`${this.adminBase}/archived`);
  }

  getForUser(userId: string): Observable<FeedbackItem[]> {
    return this.http.get<FeedbackItem[]>(`${this.adminBase}/user/${userId}`);
  }

  adminGetThread(feedbackId: string): Observable<FeedbackItem> {
    return this.http.get<FeedbackItem>(`${this.adminBase}/${feedbackId}/thread`);
  }

  adminReply(feedbackId: string, body: string, sendEmail = false): Observable<FeedbackReply> {
    return this.http.post<FeedbackReply>(`${this.adminBase}/${feedbackId}/reply`, { body, sendEmail });
  }

  updateStatus(feedbackId: string, status: string): Observable<FeedbackItem> {
    return this.http.patch<FeedbackItem>(`${this.adminBase}/${feedbackId}/status`, { status });
  }

  getFeedbackSettings(): Observable<{ feedbackEnabledByDefault: boolean }> {
    return this.http.get<{ feedbackEnabledByDefault: boolean }>(`${this.adminBase}/settings`);
  }

  updateFeedbackSettings(feedbackEnabledByDefault: boolean): Observable<any> {
    return this.http.patch(`${this.adminBase}/settings`, { feedbackEnabledByDefault });
  }

  toggleUserFeedback(userId: string, enabled: boolean): Observable<any> {
    return this.http.patch(`/api/super-admin/users/${userId}/feedback-enabled`, { enabled });
  }
}

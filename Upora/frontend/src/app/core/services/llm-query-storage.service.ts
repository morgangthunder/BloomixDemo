import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface LlmQueryApiResponse {
  assistantId: string;
  total: number;
  logs: LlmQueryApiLog[];
}

interface LlmQueryApiLog {
  id: string;
  assistantId: string;
  userId: string;
  tenantId: string;
  promptText: string;
  tokensUsed: number;
  createdAt: string;
  requestPayload: any;
  responsePayload: any;
  isPinned: boolean;
}

export interface LlmQueryRecord {
  id: string;
  assistantId: string;
  createdAt: Date;
  tokensUsed: number;
  promptText: string;
  requestPayload: any;
  responsePayload: any;
  requestPayloadString: string;
  responsePayloadString: string;
  messagePreview: string;
  lessonId?: string;
  lessonTitle?: string;
  userQuestion?: string;
  isPinned: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LlmQueryStorageService {
  private readonly recordsSubject = new BehaviorSubject<LlmQueryRecord[]>([]);
  private currentAssistant = 'teacher';
  private currentLimit = 5;

  constructor(private http: HttpClient) {}

  get records$(): Observable<LlmQueryRecord[]> {
    return this.recordsSubject.asObservable();
  }

  get snapshot(): LlmQueryRecord[] {
    return this.recordsSubject.value;
  }

  async refresh(assistantId = 'teacher', limit = 5): Promise<void> {
    this.currentAssistant = assistantId;
    this.currentLimit = limit;

    try {
      const response = await this.http
        .get<LlmQueryApiResponse>(`${environment.apiUrl}/super-admin/llm-queries`, {
          params: {
            assistant: assistantId,
            limit: String(limit),
          },
        })
        .toPromise();

      const records =
        response?.logs?.map((log) => this.transformLog(log)) ?? [];
      this.recordsSubject.next(records);
    } catch (error) {
      console.error('[LLM Query Storage] Failed to load queries', error);
      this.recordsSubject.next([]);
    }
  }

  async setPinned(id: string, isPinned: boolean): Promise<void> {
    try {
      await this.http
        .patch(`${environment.apiUrl}/super-admin/llm-queries/${id}/pin`, {
          isPinned,
        })
        .toPromise();
      await this.refresh(this.currentAssistant, this.currentLimit);
    } catch (error) {
      console.error('[LLM Query Storage] Failed to update pin status', error);
    }
  }

  private transformLog(log: LlmQueryApiLog): LlmQueryRecord {
    const lessonContext = log.requestPayload?.lessonContext || {};
    const lessonData = lessonContext.lessonData || {};
    const lessonId =
      lessonContext.lessonId ||
      lessonData.id ||
      lessonData._id ||
      lessonData.lessonId;

    const lessonTitle =
      lessonData.title ||
      lessonData.name ||
      lessonData.lessonTitle ||
      'Untitled Lesson';

    const userQuestion = this.extractUserQuestion(log.requestPayload);
    const messagePreview =
      userQuestion && userQuestion.length > 120
        ? `${userQuestion.slice(0, 117)}...`
        : userQuestion || '(No user question)';

    return {
      id: log.id,
      assistantId: log.assistantId,
      createdAt: new Date(log.createdAt),
      tokensUsed: log.tokensUsed,
      promptText: log.promptText,
      requestPayload: log.requestPayload,
      responsePayload: log.responsePayload,
      requestPayloadString: this.stringify(log.requestPayload),
      responsePayloadString: this.stringify(log.responsePayload),
      messagePreview,
      lessonId,
      lessonTitle,
      userQuestion,
      isPinned: log.isPinned,
    };
  }

  private extractUserQuestion(requestPayload: any): string | undefined {
    if (!requestPayload?.messages) {
      return undefined;
    }
    const lastUserMessage = [...requestPayload.messages]
      .reverse()
      .find((msg) => msg.role === 'user');
    return lastUserMessage?.content;
  }

  private stringify(payload: any): string {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  }
}


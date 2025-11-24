import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { LlmQueryStorageService, LlmQueryRecord } from '../../core/services/llm-query-storage.service';

@Component({
  selector: 'app-view-queries',
  standalone: true,
  imports: [CommonModule, IonContent, DatePipe],
  template: `
    <ion-content [fullscreen]="true" [style.--padding-top]="'80px'" class="queries-wrapper">
      <div class="queries-page">
        <div class="page-header">
          <button class="back-btn" (click)="goBack()">← Back to Tests</button>
          <div class="header-text">
            <h1>🧠 Recent LLM Queries</h1>
            <p class="subtitle">
              Exact payloads sent to the AI Teacher, including prompts, lesson JSON, screenshots, and Weaviate chunks.
            </p>
          </div>
          <button class="btn-secondary" (click)="refresh()" [disabled]="isLoading">
            {{ isLoading ? '⏳ Refreshing...' : '🔄 Refresh' }}
          </button>
        </div>

        <ng-container *ngIf="queries.length > 0; else emptyState">
          <div class="query-list">
            <div *ngFor="let query of queries; let idx = index" class="query-card">
              <details>
                <summary class="query-summary">
                  <div class="summary-top">
                    <div class="summary-title">
                      <span class="query-number">#{{ idx + 1 }}</span>
                      <span class="query-assistant">{{ query.assistantId | titlecase }}</span>
                      <span class="lesson-title">{{ query.lessonTitle }}</span>
                      <span *ngIf="query.isPinned" class="saved-pill">Pinned</span>
                    </div>
                    <div class="summary-timestamp">
                      {{ query.createdAt | date:'short' }}
                    </div>
                  </div>
                  <p class="summary-preview">{{ query.messagePreview }}</p>
                </summary>

                <div class="query-meta">
                  <div>
                    <strong>Lesson:</strong>
                    <span>{{ query.lessonTitle }}</span>
                    <span class="lesson-id" *ngIf="query.lessonId">({{ query.lessonId }})</span>
                  </div>
                  <div>
                    <strong>Tokens Used:</strong> {{ query.tokensUsed }}
                  </div>
                  <div>
                    <strong>Captured:</strong>
                    {{ query.createdAt | date:'medium' }} ({{ query.createdAt | date:'shortTime' }})
                  </div>
                </div>

                <div class="query-controls">
                  <button
                    class="btn-secondary"
                    (click)="togglePin(query)"
                    [class.saved]="query.isPinned"
                  >
                    {{ query.isPinned ? '📌 Unpin' : '📌 Pin Query' }}
                  </button>
                  <button class="btn-secondary" (click)="copyText(query.requestPayloadString)">
                    📋 Copy Request JSON
                  </button>
                  <button class="btn-secondary" (click)="copyText(query.responsePayloadString)">
                    📋 Copy Response JSON
                  </button>
                </div>

                <div class="payload-columns">
                  <div class="payload-card">
                    <h4>Request Payload</h4>
                    <pre class="query-payload">{{ query.requestPayloadString }}</pre>
                  </div>
                  <div class="payload-card">
                    <h4>LLM Response</h4>
                    <pre class="query-payload">{{ query.responsePayloadString }}</pre>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </ng-container>

        <ng-template #emptyState>
          <div class="empty-state">
            <h2>⚠️ No Queries Available</h2>
            <p>Once the AI Teacher is used in a lesson, each exact request payload will appear here.</p>
            <button class="btn-primary" (click)="goBack()">Go to Tests Page</button>
          </div>
        </ng-template>
      </div>
    </ion-content>
  `,
  styles: [
    `
      :host,
      .queries-wrapper,
      ion-content {
        --background: transparent;
        display: block;
        height: 100%;
      }

      .queries-page {
        min-height: 100vh;
        background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
        padding: 2rem 2rem 3rem;
        color: #e0e0e0;
      }

      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 2rem;
      }

      .back-btn {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 0.5rem 1rem;
        border-radius: 999px;
        cursor: pointer;
        font-size: 0.9rem;
      }

      .back-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .header-text {
        flex: 1;
        text-align: center;
      }

      .header-text h1 {
        margin: 0;
        font-size: 2rem;
      }

      .subtitle {
        margin: 0.25rem 0 0;
        color: rgba(255, 255, 255, 0.7);
      }

      .query-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .query-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1rem;
      }

      details {
        width: 100%;
      }

      summary {
        cursor: pointer;
        list-style: none;
      }

      summary::-webkit-details-marker {
        display: none;
      }

      .query-summary {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .summary-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .summary-title {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }

      .query-number {
        font-weight: 600;
        font-size: 1.05rem;
      }

      .query-assistant {
        color: #00d4ff;
        font-weight: 500;
      }

      .lesson-title {
        color: rgba(255, 255, 255, 0.85);
        font-style: italic;
      }

      .saved-pill {
        background: rgba(0, 212, 255, 0.15);
        border: 1px solid rgba(0, 212, 255, 0.4);
        color: #00d4ff;
        font-size: 0.75rem;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .summary-preview {
        margin: 0;
        color: rgba(255, 255, 255, 0.9);
      }

      .summary-timestamp {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
      }

      .query-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin: 1rem 0;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.85);
      }

      .lesson-id {
        opacity: 0.7;
        margin-left: 0.5rem;
        font-size: 0.85rem;
      }

      .query-controls {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
        flex-wrap: wrap;
      }

      .btn-primary,
      .btn-secondary {
        padding: 0.6rem 1.25rem;
        border-radius: 8px;
        border: 1px solid transparent;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-primary {
        background: #00d4ff;
        color: #050505;
      }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.2);
      }

      .btn-secondary.saved {
        background: rgba(0, 212, 255, 0.2);
        border-color: rgba(0, 212, 255, 0.5);
        color: #00d4ff;
      }

      .btn-secondary:hover,
      .btn-primary:hover {
        transform: translateY(-2px);
      }

      .payload-columns {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
      }

      .payload-card {
        background: rgba(0, 0, 0, 0.5);
        border-radius: 8px;
        padding: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .payload-card h4 {
        margin: 0 0 0.5rem;
        color: #00d4ff;
        font-size: 0.95rem;
      }

      .query-payload {
        background: transparent;
        border: none;
        color: #fff;
        font-size: 0.82rem;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: break-word;
        max-height: 320px;
        overflow: auto;
        margin: 0;
      }

      .empty-state {
        margin-top: 3rem;
        padding: 2.5rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
      }
    `,
  ],
})
export class ViewQueriesComponent implements OnInit, OnDestroy {
  queries: LlmQueryRecord[] = [];
  isLoading = false;
  private subscription?: Subscription;

  constructor(
    private router: Router,
    private queryStorage: LlmQueryStorageService
  ) {}

  ngOnInit(): void {
    this.subscription = this.queryStorage.records$.subscribe(records => {
      this.queries = records;
    });
    this.refresh();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async refresh(): Promise<void> {
    this.isLoading = true;
    await this.queryStorage.refresh('teacher', 5);
    this.isLoading = false;
  }

  goBack(): void {
    this.router.navigate(['/super-admin/tests']);
  }

  togglePin(record: LlmQueryRecord): void {
    this.queryStorage.setPinned(record.id, !record.isPinned);
  }

  copyText(text: string): void {
    navigator.clipboard?.writeText(text || '').catch(() => {
      console.warn('Failed to copy content');
    });
  }
}


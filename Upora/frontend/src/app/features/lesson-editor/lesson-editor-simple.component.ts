import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentProcessorModalComponent } from '../../shared/components/content-processor-modal/content-processor-modal.component';
import { ApprovalQueueModalComponent } from '../../shared/components/approval-queue-modal/approval-queue-modal.component';

@Component({
  selector: 'app-lesson-editor-simple',
  standalone: true,
  imports: [CommonModule, FormsModule, ContentProcessorModalComponent, ApprovalQueueModalComponent],
  template: `
    <div class="lesson-editor-simple">
      <h1>Simple Lesson Editor Test</h1>
      <p>Testing the Paste URL button functionality</p>
      
      <div class="content-section">
        <h2>Content Processing</h2>
        <button (click)="openContentProcessor()" class="btn-primary">
          🔗 Paste URL
        </button>
        <button (click)="openApprovalQueue()" class="btn-secondary">
          📋 Approval Queue
        </button>
      </div>

      <!-- Content Processor Modal -->
      <app-content-processor-modal
        [isOpen]="showContentProcessor"
        [lessonId]="'test-lesson-id'"
        (contentProcessed)="onContentProcessed($event)"
        (contentSubmittedForApproval)="onContentSubmittedForApproval($event)"
        (closed)="closeContentProcessor()">
      </app-content-processor-modal>

      <!-- Approval Queue Modal -->
      <app-approval-queue-modal
        [isOpen]="showApprovalQueue"
        [canApprove]="true"
        (itemApproved)="onItemApproved($event)"
        (itemRejected)="onItemRejected($event)"
        (closed)="closeApprovalQueue()">
      </app-approval-queue-modal>
    </div>
  `,
  styles: [`
    .lesson-editor-simple {
      padding: 20px;
      background: #1f2937;
      color: white;
      min-height: 100vh;
      margin-top: 64px; /* Account for header height */
    }
    .content-section {
      margin: 20px 0;
    }
    .btn-primary, .btn-secondary {
      padding: 10px 20px;
      margin: 10px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-primary {
      background: #ef4444;
      color: white;
    }
    .btn-secondary {
      background: #6b7280;
      color: white;
    }
  `]
})
export class LessonEditorSimpleComponent implements OnInit {
  showContentProcessor = false;
  showApprovalQueue = false;

  constructor(private router: Router) {}

  ngOnInit() {
    console.log('Simple lesson editor component loaded');
  }

  goBack() {
    this.router.navigate(['/lesson-builder']);
  }

  openContentProcessor() {
    console.log('[SimpleEditor] Opening content processor');
    this.showContentProcessor = true;
  }

  closeContentProcessor() {
    this.showContentProcessor = false;
  }

  onContentProcessed(event: any) {
    console.log('Content processed:', event);
    this.showContentProcessor = false;
  }

  onContentSubmittedForApproval(event: any) {
    console.log('Content submitted for approval:', event);
    this.showContentProcessor = false;
    // Optionally open approval queue to show the new submission
    this.showApprovalQueue = true;
  }

  openApprovalQueue() {
    console.log('[SimpleEditor] Opening approval queue');
    this.showApprovalQueue = true;
  }

  closeApprovalQueue() {
    this.showApprovalQueue = false;
  }

  onItemApproved(event: any) {
    console.log('Item approved:', event);
  }

  onItemRejected(event: any) {
    console.log('Item rejected:', event);
  }
}

import { Component, EventEmitter, Output, Input, OnInit, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ProcessedContentService, ProcessedContentItem } from '../../../core/services/processed-content.service';
import { ContentSourceService } from '../../../core/services/content-source.service';

// YouTube data interfaces (no longer using YouTubeProcessorService)
export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  channel: string;
  channelId?: string;
  publishedAt?: string;
  viewCount?: number;
  likeCount?: number;
  transcript?: string;
  captions?: any[];
}

interface InteractionType {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

@Component({
  selector: 'app-content-processor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>🔧 Process Content</h2>
          <button (click)="close(); $event.stopPropagation()" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <!-- Step 1: Select URL Type -->
          <div class="step" [class.active]="currentStep === 1">
            <h3>1. Choose URL Type</h3>
            <div class="interaction-types">
              <div 
                *ngFor="let type of interactionTypes" 
                class="interaction-type-card"
                [class.selected]="selectedInteractionType?.id === type.id"
                [class.disabled]="!type.enabled"
                (click)="selectInteractionType(type)">
                <div class="interaction-icon">{{type.icon}}</div>
                <div class="interaction-info">
                  <h4>{{type.name}}</h4>
                  <p>{{type.description}}</p>
                </div>
                <div class="interaction-status" *ngIf="!type.enabled">
                  <span class="coming-soon">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Configure Content -->
          <div class="step" [class.active]="currentStep === 2" *ngIf="selectedInteractionType">
            <h3>2. Configure {{selectedInteractionType.name}}</h3>
            
            <!-- iFrame Guide URL Configuration -->
            <div *ngIf="selectedInteractionType.id === 'iframe_guide_url'" class="iframe-guide-config">
              <div class="url-input-section">
                <label>Webpage URL</label>
                <div class="input-group">
                  <input
                    type="url"
                    [(ngModel)]="iframeGuideUrl"
                    placeholder="https://example.com/guide"
                    class="url-input"
                    [class.error]="urlError">
                </div>
                <div class="url-error" *ngIf="urlError">
                  <span class="error-icon">⚠️</span>
                  {{urlError}}
                </div>
                <p class="hint-white">Enter a webpage URL that contains guidance for navigating a web app or playing a game. This will be processed and used to help guide users through the iframe interaction.</p>
              </div>

              <div class="modal-actions">
                <button (click)="previousStep()" class="btn-secondary">Back</button>
                <button 
                  (click)="processIframeGuideUrl()" 
                  [disabled]="!iframeGuideUrl || processing"
                  class="btn-primary">
                  {{processing ? 'Processing...' : 'Add & Process'}}
                </button>
              </div>

              <div *ngIf="processing" class="processing-status">
                <div class="spinner"></div>
                <p>{{processingMessage}}</p>
              </div>
            </div>
            
            <!-- YouTube Video Configuration -->
            <div *ngIf="selectedInteractionType.id === 'youtube_video'" class="youtube-config">
              <div class="url-input-section">
                <label>YouTube URL</label>
                <div class="input-group">
                  <input
                    type="url"
                    [(ngModel)]="youtubeUrl"
                    (ngModelChange)="validateYouTubeUrl($event)"
                    placeholder="https://www.youtube.com/watch?v=..."
                    class="url-input"
                    [class.error]="urlError">
                </div>
                <div class="url-error" *ngIf="urlError">
                  <span class="error-icon">⚠️</span>
                  {{urlError}}
                </div>
              </div>

              <!-- Time Range Configuration -->
              <div class="time-range-section" *ngIf="isValidYouTubeUrl">
                <h4>⏱️ Time Range (Optional)</h4>
                <p class="hint">Configure start and end times to process only a specific segment of the video.</p>
                
                <div class="time-inputs">
                  <div class="time-input-group">
                    <label>Start Time</label>
                    <input
                      type="text"
                      [(ngModel)]="startTimeInput"
                      (ngModelChange)="parseStartTime($event)"
                      placeholder="0:35 or 35"
                      class="time-input">
                    <span class="time-display">{{formatTime(startTime || 0)}}</span>
                  </div>
                  
                  <div class="time-input-group">
                    <label>End Time</label>
                    <input
                      type="text"
                      [(ngModel)]="endTimeInput"
                      (ngModelChange)="parseEndTime($event)"
                      placeholder="2:30 or 150"
                      class="time-input">
                    <span class="time-display">{{formatTime(endTime || 0)}}</span>
                  </div>
                </div>
                
                <div class="time-range-info" *ngIf="(startTime || 0) > 0 || (endTime || 0) > 0">
                  <span class="info-icon">ℹ️</span>
                  <span>Will process segment: {{formatTime(startTime || 0)}} - {{formatTime(endTime || 0)}}</span>
                </div>
              </div>

              <!-- Process Button -->
              <div class="process-section" *ngIf="isValidYouTubeUrl">
                <button 
                  (click)="processYouTubeUrl()" 
                  [disabled]="processing"
                  [class.disabled]="isTimeRangeTooLong()"
                  class="process-btn">
                  {{processing ? 'Processing...' : '🔧 Process Content'}}
                </button>
              </div>

              <!-- Video Preview -->
              <div class="video-preview" *ngIf="videoData">
                <div class="video-thumbnail">
                  <img [src]="videoData.thumbnail" [alt]="videoData.title" class="thumbnail">
                  <div class="video-overlay">
                    <div class="play-button">▶️</div>
                    <div class="duration">{{formatDuration(videoData.duration)}}</div>
                  </div>
                </div>
                
                <div class="video-info">
                  <h4 class="video-title">{{videoData.title}}</h4>
                  <p class="video-channel">{{videoData.channel}}</p>
                  <p class="video-description">{{truncateText(videoData.description, 100)}}</p>
                </div>
              </div>

              <!-- Time Range Configuration -->
              <div class="time-config" *ngIf="videoData">
                <h4>Time Range (Optional)</h4>
                <div class="time-inputs">
                  <div class="time-input-group">
                    <label>Start Time (seconds)</label>
                    <input 
                      type="number" 
                      [(ngModel)]="startTime"
                      [min]="0"
                      [max]="videoData.duration"
                      placeholder="0"
                      class="time-input">
                  </div>
                  
                  <div class="time-input-group">
                    <label>End Time (seconds)</label>
                    <input 
                      type="number" 
                      [(ngModel)]="endTime"
                      [min]="startTime || 0"
                      [max]="videoData.duration"
                      [placeholder]="videoData.duration"
                      class="time-input">
                  </div>
                </div>
                
                <div class="time-preview" *ngIf="hasTimeRange()">
                  <span class="time-label">Preview:</span>
                  <span class="time-display">
                    {{formatTime(startTime || 0)}} - {{formatTime(endTime || videoData.duration)}}
                    ({{formatDuration((endTime || videoData.duration) - (startTime || 0))}})
                  </span>
                </div>
              </div>

              <!-- Player Settings -->
              <div class="player-settings" *ngIf="videoData">
                <h4>Player Settings</h4>
                <div class="settings-grid">
                  <label class="setting-item">
                    <input type="checkbox" [(ngModel)]="autoplay">
                    <span class="checkmark"></span>
                    Autoplay
                  </label>
                  
                  <label class="setting-item">
                    <input type="checkbox" [(ngModel)]="showControls" [checked]="true">
                    <span class="checkmark"></span>
                    Show Controls
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Review & Submit -->
          <div class="step" [class.active]="currentStep === 3" *ngIf="processedContent">
            <h3>3. Review & Submit</h3>
            
            <div class="content-review">
              <div class="content-preview">
                <h4>Content Preview</h4>
                <div class="preview-card">
                  <div class="preview-header">
                    <span class="content-type">{{selectedInteractionType?.name}}</span>
                    <span class="content-status" [class]="getContentStatus()">{{getContentStatus()}}</span>
                  </div>
                  <div class="preview-body">
                    <h5>{{processedContent.title}}</h5>
                    <p>{{processedContent.description}}</p>
                    <div class="preview-meta">
                      <span *ngIf="processedContent.duration">{{formatDuration(processedContent.duration)}}</span>
                      <span *ngIf="processedContent.channel">{{processedContent.channel}}</span>
                      <span *ngIf="hasTimeRange()">
                        {{formatTime(startTime || 0)}} - {{formatTime(endTime || processedContent.duration)}}
                      </span>
                    </div>
                    <div class="preview-actions">
                      <button (click)="viewExtractedData()" class="view-data-btn">
                        🔍 View Extracted Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="validation-results" *ngIf="validationScore > 0">
                <h4>Content Validation</h4>
                <div class="validation-score">
                  <div class="score-circle" [class]="getScoreClass(validationScore)">
                    {{validationScore}}%
                  </div>
                  <div class="score-label">Educational Score</div>
                </div>
                <div class="validation-message" [class]="getValidationClass()">
                  {{getValidationMessage()}}
                </div>
              </div>
            </div>
          </div>

          <!-- Processing Status -->
          <div class="processing-status" *ngIf="processing">
            <div class="spinner"></div>
            <div class="status-text">
              <h4>Processing Content...</h4>
              <p>{{processingMessage}}</p>
            </div>
          </div>

          <!-- Error State -->
          <div class="error-state" *ngIf="hasError">
            <div class="error-icon">⚠️</div>
            <h3>Processing Failed</h3>
            <p>{{errorMessage}}</p>
            <button (click)="retry()" class="retry-btn">Try Again</button>
          </div>
        </div>

        <div class="modal-footer">
          <div class="step-indicator">
            <span *ngFor="let step of [1,2,3]" 
                  class="step-dot" 
                  [class.active]="step <= currentStep"
                  [class.current]="step === currentStep">
              {{step}}
            </span>
          </div>
          
          <div class="actions">
            <button 
              (click)="previousStep()" 
              [disabled]="currentStep === 1"
              class="btn-secondary">
              Previous
            </button>
            <button 
              (click)="nextStep()" 
              [disabled]="!canProceed()"
              class="btn-primary">
              {{currentStep === 3 ? 'Submit for Approval' : 'Next'}}
            </button>
            <button (click)="close()" class="btn-cancel">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Extracted Data Modal -->
    <div class="data-modal-overlay" *ngIf="showDataModal" (click)="closeDataModal()">
      <div class="data-modal-content" (click)="$event.stopPropagation()">
        <div class="data-modal-header">
          <h3>🔍 Extracted Data</h3>
          <button (click)="closeDataModal()" class="close-btn">✕</button>
        </div>
        <div class="data-modal-body">
          <div class="data-section">
            <h4>📹 Video Metadata</h4>
            <div class="data-grid">
              <div class="data-item">
                <label>Title:</label>
                <span>{{processedContent?.title}}</span>
              </div>
              <div class="data-item">
                <label>Channel:</label>
                <span>{{processedContent?.channel}}</span>
              </div>
              <div class="data-item">
                <label>Duration:</label>
                <span>{{formatDuration(processedContent?.duration || 0)}}</span>
              </div>
              <div class="data-item">
                <label>Views:</label>
                <span>{{processedContent?.viewCount?.toLocaleString() || 'N/A'}}</span>
              </div>
              <div class="data-item">
                <label>Published:</label>
                <span>{{processedContent?.publishedAt | date:'medium'}}</span>
              </div>
            </div>
          </div>

          <div class="data-section">
            <h4>📝 Transcript</h4>
            <div class="transcript-content">
              <p>{{processedContent?.transcript || 'None available'}}</p>
            </div>
          </div>

          <div class="data-section" *ngIf="hasTimeRange()">
            <h4>⏱️ Time Range</h4>
            <div class="time-range-data">
              <div class="data-item">
                <label>Start Time:</label>
                <span>{{formatTime(startTime || 0)}}</span>
              </div>
              <div class="data-item">
                <label>End Time:</label>
                <span>{{formatTime(endTime || processedContent?.duration || 0)}}</span>
              </div>
              <div class="data-item">
                <label>Segment Duration:</label>
                <span>{{formatTime((endTime || processedContent?.duration || 0) - (startTime || 0))}}</span>
              </div>
            </div>
          </div>

          <div class="data-section">
            <h4>🔧 Processing Details</h4>
            <div class="data-grid">
              <div class="data-item">
                <label>Processing Time:</label>
                <span>{{processedContent?.processingTime || 0}}ms</span>
              </div>
              <div class="data-item">
                <label>Video ID:</label>
                <span>{{processedContent?.videoId}}</span>
              </div>
              <div class="data-item">
                <label>Status:</label>
                <span class="status-ready">✅ Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Snackbar -->
    <div class="snackbar" *ngIf="showSnackbar" [class.show]="showSnackbar">
      {{snackbarMessage}}
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 20px;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      .modal-overlay {
        padding: 8px;
      }
    }

    .modal-content {
      background: #1f2937;
      border-radius: 16px;
      width: 100%;
      max-width: 800px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    @media (max-width: 768px) {
      .modal-content {
        border-radius: 12px;
        max-width: 100%;
        max-height: calc(100vh - 16px);
        height: calc(100vh - 16px);
      }
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .modal-header h2 {
      color: white;
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
    .close-btn {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
    }
    .close-btn:hover {
      color: white;
    }
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    .step {
      display: none;
    }
    .step.active {
      display: block;
    }
    .step h3 {
      color: white;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .interaction-types {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }
    .interaction-type-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }
    .interaction-type-card:hover:not(.disabled) {
      border-color: rgba(239,68,68,0.3);
      background: rgba(239,68,68,0.05);
    }
    .interaction-type-card.selected {
      border-color: #ef4444;
      background: rgba(239,68,68,0.1);
    }
    .interaction-type-card.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .interaction-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
    .interaction-info h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .interaction-info p {
      color: #d1d5db;
      font-size: 14px;
      line-height: 1.4;
    }
    .interaction-status {
      position: absolute;
      top: 12px;
      right: 12px;
    }
    .coming-soon {
      background: rgba(251,191,36,0.2);
      color: #fbbf24;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .url-input-section {
      margin-bottom: 24px;
    }
    .url-input-section label {
      display: block;
      color: #d1d5db;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .input-group {
      display: flex;
      gap: 12px;
    }
    .url-input {
      flex: 1;
      padding: 12px 16px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: white;
      font-size: 14px;
    }
    .url-input:focus {
      outline: none;
      border-color: #ef4444;
    }
    .url-input.error {
      border-color: #ef4444;
    }
    
    .time-range-section {
      margin-top: 20px;
      padding: 20px;
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .time-range-section h4 {
      color: white;
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }
    .time-range-section .hint {
      color: #9ca3af;
      font-size: 14px;
      margin: 0 0 16px 0;
    }
    .hint-white {
      color: white;
      font-size: 14px;
      margin: 12px 0 0 0;
      line-height: 1.5;
    }
    .iframe-guide-config {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .time-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .time-input-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .time-input-group label {
      color: #d1d5db;
      font-size: 14px;
      font-weight: 500;
    }
    .time-input {
      padding: 10px 12px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      background: rgba(0,0,0,0.3);
      color: white;
      font-size: 14px;
    }
    .time-input:focus {
      outline: none;
      border-color: #ef4444;
    }
    .time-display {
      color: #9ca3af;
      font-size: 12px;
      font-family: monospace;
    }
    .time-range-info {
      margin-top: 12px;
      padding: 8px 12px;
      background: #1e3a8a;
      border-radius: 6px;
      color: #dbeafe;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-icon {
      font-size: 16px;
    }
    .process-section {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
    .preview-actions {
      margin-top: 16px;
      display: flex;
      justify-content: center;
    }
    .view-data-btn {
      background: #1e40af;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      display: inline-block;
    }
    .view-data-btn:hover {
      background: #1d4ed8;
    }
    .view-data-btn:active {
      background: #1e3a8a;
    }
    .data-modal-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(0,0,0,0.9) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 2147483647 !important;
      padding: 20px !important;
      box-sizing: border-box !important;
    }
    .data-modal-content {
      background: #1f2937;
      border-radius: 16px;
      max-width: 800px;
      max-height: 80vh;
      width: 90%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .data-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .data-modal-header h3 {
      color: white;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
    .data-modal-body {
      padding: 24px;
      overflow-y: auto;
      max-height: 60vh;
    }
    .data-section {
      margin-bottom: 24px;
    }
    .data-section h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 12px 0;
    }
    .data-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .data-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .data-item label {
      color: #9ca3af;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-item span {
      color: white;
      font-size: 14px;
    }
    .transcript-content {
      background: #111827;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #374151;
    }
    .transcript-content p {
      color: #d1d5db;
      line-height: 1.6;
      margin: 0;
    }
    .time-range-data {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }
    .status-ready {
      color: #10b981;
      font-weight: 600;
    }
    .process-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .process-btn:hover:not(:disabled) {
      background: #dc2626;
    }
    .process-btn:disabled,
    .process-btn.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #6b7280;
    }
    .time-limit-warning {
      margin-top: 8px;
      padding: 8px 12px;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      color: #92400e;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .warning-icon {
      font-size: 16px;
    }
    .snackbar {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ef4444;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000000;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .snackbar.show {
      opacity: 1;
    }
    .url-error {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ef4444;
      font-size: 14px;
      margin-top: 8px;
    }
    .error-icon {
      font-size: 16px;
    }
    .video-preview {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
    }
    .video-thumbnail {
      position: relative;
      width: 160px;
      height: 90px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .video-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .play-button {
      font-size: 24px;
      color: white;
    }
    .duration {
      position: absolute;
      bottom: 4px;
      right: 4px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
    }
    .video-info {
      flex: 1;
    }
    .video-title {
      color: white;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
      line-height: 1.3;
    }
    .video-channel {
      color: #60a5fa;
      font-size: 12px;
      margin-bottom: 6px;
    }
    .video-description {
      color: #d1d5db;
      font-size: 12px;
      line-height: 1.4;
    }
    .time-config, .player-settings {
      margin-bottom: 20px;
    }
    .time-config h4, .player-settings h4 {
      color: white;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .time-inputs {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }
    .time-input-group {
      flex: 1;
    }
    .time-input-group label {
      display: block;
      color: #d1d5db;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .time-input {
      width: 100%;
      padding: 8px 12px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
    }
    .time-input:focus {
      outline: none;
      border-color: #ef4444;
    }
    .time-preview {
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 6px;
      padding: 8px 12px;
      color: #ef4444;
      font-size: 12px;
    }
    .time-label {
      font-weight: 600;
      margin-right: 8px;
    }
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }
    .setting-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #d1d5db;
      font-size: 13px;
      cursor: pointer;
    }
    .setting-item input[type="checkbox"] {
      display: none;
    }
    .checkmark {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 4px;
      position: relative;
      transition: all 0.2s;
    }
    .setting-item input[type="checkbox"]:checked + .checkmark {
      background: #ef4444;
      border-color: #ef4444;
    }
    .setting-item input[type="checkbox"]:checked + .checkmark::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 10px;
    }
    .content-review {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .content-preview h4, .validation-results h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .preview-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 16px;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .content-type {
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .content-status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .content-status.ready {
      background: rgba(16,185,129,0.2);
      color: #10b981;
    }
    .content-status.processing {
      background: rgba(251,191,36,0.2);
      color: #fbbf24;
    }
    .preview-body h5 {
      color: white;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .preview-body p {
      color: #d1d5db;
      font-size: 12px;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .preview-meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: #9ca3af;
    }
    .validation-score {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .score-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
    }
    .score-circle.high {
      background: rgba(16,185,129,0.2);
      color: #10b981;
      border: 2px solid #10b981;
    }
    .score-circle.medium {
      background: rgba(251,191,36,0.2);
      color: #fbbf24;
      border: 2px solid #fbbf24;
    }
    .score-circle.low {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
      border: 2px solid #ef4444;
    }
    .score-label {
      color: #9ca3af;
      font-size: 12px;
    }
    .validation-message {
      padding: 12px;
      border-radius: 6px;
      font-size: 13px;
      margin-top: 8px;
    }
    .validation-message.approved {
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.2);
      color: #10b981;
    }
    .validation-message.warning {
      background: rgba(251,191,36,0.1);
      border: 1px solid rgba(251,191,36,0.2);
      color: #fbbf24;
    }
    .validation-message.rejected {
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.2);
      color: #ef4444;
    }
    .processing-status {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(59,130,246,0.1);
      border: 1px solid rgba(59,130,246,0.2);
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(59,130,246,0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .status-text h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .status-text p {
      color: #d1d5db;
      font-size: 14px;
      margin: 0;
    }
    .error-state {
      text-align: center;
      padding: 40px 20px;
      color: #ef4444;
    }
    .error-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .error-state h3 {
      color: white;
      margin-bottom: 8px;
    }
    .retry-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      margin-top: 16px;
    }
    .modal-footer {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
      background: #1f2937;
      min-height: 64px;
    }

    @media (max-width: 768px) {
      .modal-footer {
        flex-wrap: wrap;
        gap: 12px;
        padding: 12px 16px;
        padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      }
    }

    .step-indicator {
      display: flex;
      gap: 8px;
      order: 1;
    }

    @media (max-width: 768px) {
      .step-indicator {
        width: 100%;
        justify-content: center;
        order: 0;
      }
    }
    .step-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      color: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .step-dot.active {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
    }
    .step-dot.current {
      background: #ef4444;
      color: white;
    }
    .actions {
      display: flex;
      gap: 12px;
      order: 2;
    }

    @media (max-width: 768px) {
      .actions {
        width: 100%;
        order: 1;
      }
    }
    .btn-primary, .btn-secondary, .btn-cancel {
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    .btn-primary {
      background: #ef4444;
      color: white;
    }
    .btn-primary:hover:not(:disabled) {
      background: #dc2626;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    .btn-secondary:hover:not(:disabled) {
      background: rgba(255,255,255,0.15);
    }
    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-cancel {
      background: none;
      color: #9ca3af;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .btn-cancel:hover {
      color: white;
      border-color: rgba(255,255,255,0.3);
    }
  `]
})
export class ContentProcessorModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() lessonId?: string;
  @Input() videoId?: string; // For resuming OAuth processing
  @Input() resumeProcessing: boolean = false; // Flag to resume processing after OAuth
  @Output() contentProcessed = new EventEmitter<any>();
  @Output() contentSubmittedForApproval = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  currentStep = 1;
  selectedInteractionType?: InteractionType;
  youtubeUrl = '';
  iframeGuideUrl = '';
  videoData?: YouTubeVideoData;
  processedContent?: any;

  // Configuration
  startTime?: number = 0;
  endTime?: number = 300; // 5 minutes default
  startTimeInput = '0:00';
  endTimeInput = '5:00';
  autoplay = false;
  showControls = true;

  // Processing state
  processing = false;
  processingMessage = '';
  hasError = false;
  errorMessage = '';
  urlError = '';
  showDataModal = false;
  showSnackbar = false;
  snackbarMessage = '';

  // Validation
  validationScore = 0;

  // Available URL types for content sources
  interactionTypes: InteractionType[] = [
    {
      id: 'youtube_video',
      name: 'YouTube Video',
      description: 'Embed YouTube videos with custom start/end times and ad-blocking',
      icon: '🎥',
      enabled: true
    },
    {
      id: 'iframe_guide_url',
      name: 'iFrame Guide URL',
      description: 'Add a webpage URL that contains guidance for navigating a web app or playing a game. This will be processed and used to help guide users through the iframe interaction.',
      icon: '🎮',
      enabled: true
    },
    {
      id: 'audio_url',
      name: 'Audio URL',
      description: 'Embed audio content from various sources (podcasts, music, etc.)',
      icon: '🎵',
      enabled: false
    },
    {
      id: 'webpage',
      name: 'Webpage',
      description: 'Extract and process content from any webpage or article',
      icon: '🌐',
      enabled: false
    }
  ];

  constructor(
    private http: HttpClient,
    private processedContentService: ProcessedContentService,
    private contentSourceService: ContentSourceService
  ) {}

  ngOnInit() {
    if (this.isOpen) {
      this.reset();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('[ContentProcessor] 🔍 ngOnChanges detected:', changes);
    console.log('[ContentProcessor] 🔍 Current videoId:', this.videoId);
    console.log('[ContentProcessor] 🔍 Current isOpen:', this.isOpen);
    
    // Lock/unlock body scroll and hide header when modal opens/closes
    if (changes['isOpen']) {
      if (this.isOpen) {
        document.body.style.overflow = 'hidden';
        // Hide header when modal is open
        const header = document.querySelector('app-header');
        if (header) {
          (header as HTMLElement).style.display = 'none';
        }
      } else {
        document.body.style.overflow = '';
        // Show header when modal closes
        const header = document.querySelector('app-header');
        if (header) {
          (header as HTMLElement).style.display = '';
        }
      }
    }
    
    // Check if modal is opened
    if (changes['isOpen'] && this.isOpen) {
      console.log('[ContentProcessor] 🎯 Modal opened');
      
      // If we have a videoId, resume processing
      if (this.videoId) {
        console.log('[ContentProcessor] 🎯 Modal opened with videoId:', this.videoId);
        // Use setTimeout to ensure videoId is set
        setTimeout(() => this.handleVideoIdResume(), 100);
      } else {
        console.log('[ContentProcessor] ⚠️ Modal opened without videoId');
      }
    }
    
    // Check if videoId changed while modal is open
    if (changes['videoId'] && this.isOpen && this.videoId) {
      console.log('[ContentProcessor] 🎬 VideoId changed while modal open:', this.videoId);
      setTimeout(() => this.handleVideoIdResume(), 100);
    }
  }

  private handleVideoIdResume() {
    console.log('[ContentProcessor] 🎯 Auto-resuming processing for videoId:', this.videoId);
    this.youtubeUrl = `https://www.youtube.com/watch?v=${this.videoId}`;
    this.selectedInteractionType = this.interactionTypes[0]; // Select YouTube Video
    this.currentStep = 2; // Always start at step 2
    
    // DON'T auto-process - the user needs to click Process to avoid OAuth loops
    // Even with resumeProcessing flag, we can't safely complete processing automatically
    // because it will trigger OAuth again
    console.log('[ContentProcessor] ✅ YouTube URL pre-filled, ready for user to click Process');
    
    if (this.resumeProcessing) {
      console.log('[ContentProcessor] 🎯 Resume flag detected - but manual Process button required to avoid OAuth loops');
    }
  }

  selectInteractionType(type: InteractionType) {
    if (!type.enabled) return;
    this.selectedInteractionType = type;
    this.currentStep = 2;
    
    // If iframe guide URL is selected, we can process it directly
    if (type.id === 'iframe_guide_url') {
      // Stay at step 2, user will enter URL and click process
    }
  }

  validateYouTubeUrl(url: string) {
    this.urlError = '';
    
    if (!url) {
      return;
    }

    // Simple YouTube URL validation (no service needed)
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    if (!youtubeRegex.test(url)) {
      this.urlError = 'Please enter a valid YouTube URL';
    }
  }

  get isValidYouTubeUrl(): boolean {
    return !!this.youtubeUrl && !this.urlError;
  }
  
  private extractVideoId(url: string): string | null {
    // Extract video ID from YouTube URL
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  private parseTimeToSeconds(time: string): number | undefined {
    if (!time || !time.trim()) {
      return undefined;
    }
    
    // Parse "MM:SS" or "HH:MM:SS" format to seconds
    const parts = time.split(':').map(Number);
    
    if (parts.length === 2) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    return undefined;
  }

  async processYouTubeUrl() {
    if (!this.isValidYouTubeUrl) return;

    // Check time range limit
    if (this.isTimeRangeTooLong()) {
      this.showSnackbarMessage('10 minutes is the max for YouTube snippets');
      return;
    }
    
    // Check if this URL was already processed BEFORE starting any processing
    const videoId = this.extractVideoId(this.youtubeUrl);
    if (videoId && this.lessonId) {
      // Fetch from backend API instead of localStorage
      try {
        const items = await this.http.get<any[]>(`${environment.apiUrl}/lesson-editor/lessons/${this.lessonId}/processed-outputs`).toPromise();
        const isDuplicate = items?.some((item: any) => item.videoId === videoId);
        
        if (isDuplicate) {
          console.log('[ContentProcessor] ⚠️ This URL was already processed');
          this.showSnackbarMessage('This URL was already processed');
          // DON'T start processing or show Step 3 - just stay at Step 2
          return;
        }
      } catch (error) {
        console.error('[ContentProcessor] ❌ Failed to check for duplicates:', error);
        // Continue with processing if the check fails
      }
    }

    this.processing = true;
    this.hasError = false;
    this.processingMessage = 'Extracting video metadata...';

    try {
      // Convert time strings to seconds
      const startTimeSec = this.parseTimeToSeconds(this.startTimeInput);
      const endTimeSec = this.parseTimeToSeconds(this.endTimeInput);
      
      // Call backend API instead of frontend service
      const payload = {
        url: this.youtubeUrl,
        startTime: startTimeSec,
        endTime: endTimeSec
      };
      
      console.log('[ContentProcessor] 📤 Calling backend API to process YouTube URL - VERSION 0.0.2');
      console.log('[ContentProcessor] 🎬 Two-step flow: URL → source content → processed output');
      
      const result = await this.http.post<any>(
        `${environment.apiUrl}/content-sources/process-youtube`,
        payload,
        {
          headers: {
            'x-tenant-id': environment.tenantId,
            'x-user-id': environment.defaultUserId
          }
        }
      ).toPromise();
      
      console.log('[ContentProcessor] ✅ Backend response:', result);
      console.log('[ContentProcessor] 📚 Source content ID:', result.sourceContentId);
      
      if (result?.success && result.data) {
        this.videoData = result.data;
        this.processingMessage = 'Validating content...';
        
        // Simple validation score (backend can do more sophisticated validation)
        this.validationScore = result.validationScore || 75; // Default to 75 for educational content

        this.processingMessage = 'Creating processed content...';
        
        // Create processed content object
        this.processedContent = {
          id: `processed_${Date.now()}`,
          type: 'youtube_video',
          title: this.videoData!.title,
          description: this.videoData!.description,
          thumbnail: this.videoData!.thumbnail,
          duration: this.videoData!.duration,
          channel: this.videoData!.channel,
          videoId: this.videoData!.videoId,
          transcript: this.videoData!.transcript,
          startTime: this.startTime,
          endTime: this.endTime,
          autoplay: this.autoplay,
          showControls: this.showControls,
          validationScore: this.validationScore,
          status: 'ready',
          createdAt: new Date().toISOString()
        };

        this.processingMessage = 'Processing complete!';
        
        // Check if OAuth was required - if so, don't move to Step 3 yet
        const transcript = this.videoData!.transcript;
        if (transcript && transcript.includes('OAuth authentication required')) {
          console.log('[ContentProcessor] 🔄 OAuth required for transcript, staying at Step 2');
          this.processing = false;
          return;
        }
        
        // Automatically save processed content to service
        if (this.lessonId) {
          const processedContentItem: ProcessedContentItem = {
            id: `processed_${Date.now()}`,
            type: this.processedContent!.type,
            title: this.processedContent!.title,
            description: this.processedContent!.description,
            thumbnail: this.processedContent!.thumbnail,
            duration: this.processedContent!.duration,
            channel: this.processedContent!.channel,
            videoId: this.processedContent!.videoId,
            transcript: this.processedContent!.transcript,
            startTime: this.processedContent!.startTime,
            endTime: this.processedContent!.endTime,
            autoplay: this.processedContent!.autoplay,
            showControls: this.processedContent!.showControls,
            validationScore: this.processedContent!.validationScore,
            status: 'ready',
            createdAt: new Date().toISOString(),
            lessonId: this.lessonId,
            metadata: {
              videoId: this.processedContent!.videoId,
              duration: this.processedContent!.duration,
              channel: this.processedContent!.channel,
              startTime: this.processedContent!.startTime,
              endTime: this.processedContent!.endTime
            }
          };
          
          console.log('[ContentProcessor] 💾 Saving processed content to backend:', processedContentItem);
          console.log('[ContentProcessor] 🔍 lessonId:', this.lessonId, 'type:', typeof this.lessonId);
          
          // Save to backend API with link to source content
          const payload = {
            lessonId: this.lessonId,
            contentSourceId: result.sourceContentId, // Link to source content created by backend
            outputName: this.videoData!.title,
            outputType: 'youtube_video',
            outputData: {
              videoId: this.videoData!.videoId,
              url: this.youtubeUrl,
              startTime: this.startTime,
              endTime: this.endTime,
              autoplay: this.autoplay,
              showControls: this.showControls,
            },
            videoId: this.videoData!.videoId,
            title: this.videoData!.title,
            description: this.videoData!.description,
            thumbnail: this.videoData!.thumbnail,
            channel: this.videoData!.channel,
            duration: this.videoData!.duration?.toString(),
            transcript: this.videoData!.transcript,
            startTime: this.startTime,
            endTime: this.endTime,
            validationScore: this.validationScore,
            createdBy: environment.defaultUserId,
          };
          
          console.log('[ContentProcessor] 🔗 Linking processed output to source:', result.sourceContentId);
          
          console.log('[ContentProcessor] 📤 Sending payload:', payload);
          
          this.http.post(`${environment.apiUrl}/lesson-editor/processed-outputs`, payload).subscribe({
            next: (response) => {
              console.log('[ContentProcessor] ✅ Saved to backend:', response);
              
              // Emit event to parent to refresh list
              this.contentProcessed.emit({
                type: 'processed_content',
                content: response,
                lessonId: this.lessonId
              });
            },
            error: (error) => {
              console.error('[ContentProcessor] ❌ Failed to save:', error);
              this.hasError = true;
              this.errorMessage = 'Failed to save processed content';
            }
          });
        }
        
        this.currentStep = 3;
      } else {
        throw new Error(result?.error || 'Failed to process video');
      }
    } catch (error: any) {
      // Don't set error state or currentStep if OAuth is required
      if (error.message?.includes('OAuth authentication required')) {
        console.log('[ContentProcessor] 🔄 OAuth required, staying at Step 2');
        this.processing = false;
        // Don't set currentStep = 3, stay at Step 2
        return;
      }
      
      this.hasError = true;
      this.errorMessage = error.message || 'Failed to process YouTube video';
    } finally {
      this.processing = false;
    }
  }

  hasTimeRange(): boolean {
    return !!(this.startTime || this.endTime);
  }

  canProceed(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.selectedInteractionType;
      case 2:
        return !!this.processedContent;
      case 3:
        return !!this.processedContent;
      default:
        return false;
    }
  }

  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
    } else {
      this.submitForApproval();
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  submitForApproval() {
    if (!this.processedContent) return;

    // Create processed content item
    const processedContentItem: ProcessedContentItem = {
      id: `processed_${Date.now()}`,
      type: this.processedContent.type,
      title: this.processedContent.title,
      description: this.processedContent.description,
      thumbnail: this.processedContent.thumbnail,
      duration: this.processedContent.duration,
      channel: this.processedContent.channel,
      videoId: this.processedContent.videoId,
      transcript: this.processedContent.transcript,
      startTime: this.processedContent.startTime,
      endTime: this.processedContent.endTime,
      autoplay: this.processedContent.autoplay,
      showControls: this.processedContent.showControls,
      validationScore: this.processedContent.validationScore,
      status: 'ready',
      createdAt: new Date().toISOString(),
      lessonId: this.lessonId || 'unknown',
      metadata: {
        videoId: this.processedContent.videoId,
        duration: this.processedContent.duration,
        channel: this.processedContent.channel,
        startTime: this.processedContent.startTime,
        endTime: this.processedContent.endTime
      }
    };

    // Save to processed content service
    this.processedContentService.addProcessedContent(processedContentItem);

    // Create approval submission
    const approvalSubmission = {
      id: `approval_${Date.now()}`,
      type: this.processedContent.type,
      title: this.processedContent.title,
      description: this.processedContent.description,
      thumbnail: this.processedContent.thumbnail,
      submittedAt: new Date().toISOString(),
      submittedBy: 'Current User', // TODO: Get from auth service
      status: 'processing',
      processingStep: 'Extracting Metadata',
      validationScore: this.processedContent.validationScore,
      metadata: {
        videoId: this.processedContent.videoId,
        duration: this.processedContent.duration,
        channel: this.processedContent.channel,
        startTime: this.processedContent.startTime,
        endTime: this.processedContent.endTime,
        lessonId: this.lessonId
      }
    };

    // Emit both events
    this.contentProcessed.emit({
      type: 'processed_content',
      content: processedContentItem,
      lessonId: this.lessonId
    });

    this.contentSubmittedForApproval.emit(approvalSubmission);

    this.close();
  }

  close() {
    console.log('[ContentProcessor] 🔴 close() called - VERSION 0.0.1');
    console.log('[ContentProcessor] 🔍 Before close - isOpen:', this.isOpen);
    
    this.isOpen = false;
    
    console.log('[ContentProcessor] 🔍 After setting isOpen=false, emitting closed event');
    this.closed.emit();
    
    console.log('[ContentProcessor] 🔍 Calling reset()');
    this.reset();
    
    console.log('[ContentProcessor] 🔍 close() complete');
  }

  retry() {
    this.hasError = false;
    this.errorMessage = '';
    this.processing = false;
  }

  viewExtractedData() {
    console.log('View Extracted Data clicked, showDataModal:', this.showDataModal);
    console.log('Processed content:', this.processedContent);
    console.log('Transcript available:', this.processedContent?.transcript);
    console.log('All processed content keys:', Object.keys(this.processedContent || {}));
    console.log('Video data:', this.videoData);
    this.showDataModal = true;
    console.log('After setting showDataModal:', this.showDataModal);
  }

  closeDataModal() {
    this.showDataModal = false;
  }

  showSnackbarMessage(message: string) {
    this.snackbarMessage = message;
    this.showSnackbar = true;
    setTimeout(() => {
      this.showSnackbar = false;
    }, 3000);
  }

  parseStartTime(input: string) {
    this.startTimeInput = input;
    this.startTime = this.parseTimeString(input);
  }

  parseEndTime(input: string) {
    this.endTimeInput = input;
    this.endTime = this.parseTimeString(input);
  }

  parseTimeString(timeStr: string): number {
    if (!timeStr || timeStr.trim() === '') {
      return 0;
    }

    // Handle MM:SS format (e.g., "0:35", "2:30")
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10) || 0;
        const seconds = parseInt(parts[1], 10) || 0;
        return minutes * 60 + seconds;
      }
    }

    // Handle plain seconds (e.g., "35", "150")
    const seconds = parseInt(timeStr, 10);
    return isNaN(seconds) ? 0 : seconds;
  }

  isTimeRangeTooLong(): boolean {
    const duration = (this.endTime || 0) - (this.startTime || 0);
    return duration > 600; // 10 minutes = 600 seconds
  }

  async processIframeGuideUrl() {
    if (!this.iframeGuideUrl || !this.iframeGuideUrl.trim()) {
      this.urlError = 'Please enter a valid URL';
      return;
    }

    // Normalize URL
    let url = this.iframeGuideUrl.trim();
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }

    this.processing = true;
    this.processingMessage = 'Checking for existing content source...';
    this.hasError = false;
    this.urlError = '';

    try {
      // Check if content source already exists for this URL
      const existingSource = await this.contentSourceService.findContentSourceByUrl(url);
      
      let contentSource: any;
      if (existingSource) {
        console.log('[ContentProcessor] 🔍 Found existing content source for URL:', existingSource.id);
        contentSource = existingSource;
        this.processingMessage = 'Using existing content source...';
        
        // Show user-friendly message
        this.showSnackbarMessage('This URL already exists as a content source. Linking it to this lesson...');
      } else {
        // Create content source
        try {
          this.processingMessage = 'Creating content source...';
          contentSource = await this.contentSourceService.createContentSource({
            type: 'url',
            sourceUrl: url,
            title: `iFrame Guide: ${url}`,
            metadata: {
              source: 'iframe-guide',
            }
          });
          console.log('[ContentProcessor] ✅ Content source created:', contentSource.id);
        } catch (createError: any) {
          // If creation fails due to duplicate, try to find it again
          if (createError?.message?.includes('already exists')) {
            const foundSource = await this.contentSourceService.findContentSourceByUrl(url);
            if (foundSource) {
              console.log('[ContentProcessor] 🔍 Found existing content source after creation error:', foundSource.id);
              contentSource = foundSource;
              this.showSnackbarMessage('This URL already exists as a content source. Linking it to this lesson...');
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        }
      }

      // Link to lesson if lessonId is provided
      // This works even if the content source was already linked to another lesson
      if (this.lessonId) {
        this.processingMessage = 'Linking to lesson...';
        await this.contentSourceService.linkToLesson(this.lessonId, contentSource.id);
        console.log('[ContentProcessor] ✅ Linked to lesson:', this.lessonId);
      }

      // Submit for approval only if not already approved
      if (contentSource.status === 'pending') {
        this.processingMessage = 'Submitting for approval and processing...';
        await this.contentSourceService.submitForApproval(contentSource.id);
      } else {
        this.processingMessage = 'Content source already approved. Processing...';
      }

      this.processingMessage = 'Processing complete!';
      this.contentSubmittedForApproval.emit({
        contentSource,
        type: 'iframe-guide-url'
      });

      // Close modal after a short delay
      setTimeout(() => {
        this.close();
      }, 1000);
    } catch (error: any) {
      console.error('[ContentProcessor] ❌ Failed to process iframe guide URL:', error);
      this.hasError = true;
      
      // Show user-friendly error message
      if (error?.message?.includes('already exists')) {
        this.errorMessage = 'This URL is already a content source. It has been linked to this lesson. You can find it in the Content Library.';
      } else {
        this.errorMessage = error?.message || 'Failed to process URL. Please try again.';
      }
      
      this.processing = false;
    }
  }

  private reset() {
    this.currentStep = 1;
    this.selectedInteractionType = undefined;
    this.youtubeUrl = '';
    this.iframeGuideUrl = '';
    this.videoData = undefined;
    this.processedContent = undefined;
    this.startTime = undefined;
    this.endTime = undefined;
    this.startTimeInput = '';
    this.endTimeInput = '';
    this.autoplay = false;
    this.showControls = true;
    this.processing = false;
    this.hasError = false;
    this.errorMessage = '';
    this.urlError = '';
    this.validationScore = 0;
  }

  // Utility methods
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  formatTime(seconds: number): string {
    return this.formatDuration(seconds);
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  getContentStatus(): string {
    return this.processedContent?.status || 'ready';
  }

  getValidationClass(): string {
    if (this.validationScore >= 70) return 'approved';
    if (this.validationScore >= 40) return 'warning';
    return 'rejected';
  }

  getValidationMessage(): string {
    if (this.validationScore >= 70) return 'Content approved for educational use.';
    if (this.validationScore >= 40) return 'Content may be suitable but requires review.';
    return 'Content does not appear to be educational.';
  }
}

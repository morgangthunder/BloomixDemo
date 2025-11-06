import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YouTubeProcessorService, YouTubeVideoData, YouTubeProcessingResult } from '../../../core/services/youtube-processor.service';

@Component({
  selector: 'app-youtube-processor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>🎥 Process YouTube Video</h2>
          <button (click)="close()" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <!-- Step 1: URL Input -->
          <div class="step" [class.active]="currentStep === 1">
            <h3>1. Enter YouTube URL</h3>
            <div class="url-input-section">
              <div class="input-group">
                <input
                  type="url"
                  [(ngModel)]="youtubeUrl"
                  (ngModelChange)="validateUrl($event)"
                  placeholder="https://www.youtube.com/watch?v=..."
                  class="url-input"
                  [class.error]="urlError">
                <button 
                  (click)="processUrl()" 
                  [disabled]="!isValidUrl || processing"
                  class="process-btn">
                  {{processing ? 'Processing...' : 'Process Video'}}
                </button>
              </div>
              
              <div class="url-error" *ngIf="urlError">
                <span class="error-icon">⚠️</span>
                {{urlError}}
              </div>
            </div>
          </div>

          <!-- Step 2: Video Preview & Configuration -->
          <div class="step" [class.active]="currentStep === 2" *ngIf="videoData">
            <h3>2. Configure Video Settings</h3>
            
            <!-- Video Preview -->
            <div class="video-preview">
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
                <p class="video-description">{{truncateText(videoData.description, 150)}}</p>
                
                <div class="video-stats">
                  <span class="views">{{formatNumber(videoData.viewCount)}} views</span>
                  <span class="likes">{{formatNumber(videoData.likeCount)}} likes</span>
                  <span class="published">{{formatDate(videoData.publishedAt)}}</span>
                </div>
              </div>
            </div>

            <!-- Time Range Configuration -->
            <div class="time-config">
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
            <div class="player-settings">
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
                
                <label class="setting-item">
                  <input type="checkbox" [(ngModel)]="showRelated" [checked]="false">
                  <span class="checkmark"></span>
                  Show Related Videos
                </label>
              </div>
            </div>
          </div>

          <!-- Step 3: Content Validation -->
          <div class="step" [class.active]="currentStep === 3" *ngIf="videoData">
            <h3>3. Content Validation</h3>
            
            <div class="validation-results">
              <div class="validation-score">
                <div class="score-circle" [class]="getScoreClass(validationScore)">
                  {{validationScore}}%
                </div>
                <div class="score-label">Educational Score</div>
              </div>
              
              <div class="validation-details">
                <h4>Validation Results</h4>
                <div class="validation-item" *ngFor="let reason of validationReasons" [class.positive]="reason.positive">
                  <span class="validation-icon">{{reason.positive ? '✅' : '❌'}}</span>
                  <span class="validation-text">{{reason.text}}</span>
                </div>
              </div>
            </div>

            <div class="approval-status" [class]="getApprovalClass()">
              <div class="approval-icon">{{getApprovalIcon()}}</div>
              <div class="approval-text">
                <h4>{{getApprovalTitle()}}</h4>
                <p>{{getApprovalMessage()}}</p>
              </div>
            </div>
          </div>

          <!-- Processing Status -->
          <div class="processing-status" *ngIf="processing">
            <div class="spinner"></div>
            <div class="status-text">
              <h4>Processing Video...</h4>
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
              {{currentStep === 3 ? 'Add to Lesson' : 'Next'}}
            </button>
            <button (click)="close()" class="btn-cancel">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(0,0,0,0.8) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 2147483647 !important;
      padding: 20px !important;
      box-sizing: border-box !important;
    }
    .modal-content {
      background: #1f2937;
      border-radius: 16px;
      max-width: 900px;
      width: 90%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
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
    .url-input-section {
      margin-bottom: 20px;
    }
    .input-group {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
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
    .process-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .url-error {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ef4444;
      font-size: 14px;
    }
    .error-icon {
      font-size: 16px;
    }
    .video-preview {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
      padding: 20px;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
    }
    .video-thumbnail {
      position: relative;
      width: 200px;
      height: 112px;
      border-radius: 8px;
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
      font-size: 32px;
      color: white;
    }
    .duration {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .video-info {
      flex: 1;
    }
    .video-title {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    .video-channel {
      color: #60a5fa;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .video-description {
      color: #d1d5db;
      font-size: 13px;
      line-height: 1.4;
      margin-bottom: 12px;
    }
    .video-stats {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #9ca3af;
    }
    .time-config, .player-settings {
      margin-bottom: 24px;
    }
    .time-config h4, .player-settings h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .time-inputs {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
    }
    .time-input-group {
      flex: 1;
    }
    .time-input-group label {
      display: block;
      color: #d1d5db;
      font-size: 13px;
      margin-bottom: 6px;
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
      padding: 12px;
      color: #ef4444;
      font-size: 14px;
    }
    .time-label {
      font-weight: 600;
      margin-right: 8px;
    }
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }
    .setting-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #d1d5db;
      font-size: 14px;
      cursor: pointer;
    }
    .setting-item input[type="checkbox"] {
      display: none;
    }
    .checkmark {
      width: 18px;
      height: 18px;
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
      font-size: 12px;
    }
    .validation-results {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
    }
    .validation-score {
      text-align: center;
    }
    .score-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .score-circle.high {
      background: rgba(16,185,129,0.2);
      color: #10b981;
      border: 3px solid #10b981;
    }
    .score-circle.medium {
      background: rgba(251,191,36,0.2);
      color: #fbbf24;
      border: 3px solid #fbbf24;
    }
    .score-circle.low {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
      border: 3px solid #ef4444;
    }
    .score-label {
      color: #9ca3af;
      font-size: 12px;
    }
    .validation-details {
      flex: 1;
    }
    .validation-details h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .validation-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .validation-item.positive {
      color: #10b981;
    }
    .validation-item:not(.positive) {
      color: #ef4444;
    }
    .validation-icon {
      font-size: 16px;
    }
    .approval-status {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .approval-status.approved {
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.2);
    }
    .approval-status.warning {
      background: rgba(251,191,36,0.1);
      border: 1px solid rgba(251,191,36,0.2);
    }
    .approval-status.rejected {
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.2);
    }
    .approval-icon {
      font-size: 32px;
    }
    .approval-text h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .approval-text p {
      color: #d1d5db;
      font-size: 14px;
      margin: 0;
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
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .step-indicator {
      display: flex;
      gap: 8px;
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
export class YouTubeProcessorModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() videoProcessed = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  currentStep = 1;
  youtubeUrl = '';
  videoData?: YouTubeVideoData;
  
  // Configuration
  startTime?: number;
  endTime?: number;
  autoplay = false;
  showControls = true;
  showRelated = false;

  // Processing state
  processing = false;
  processingMessage = '';
  hasError = false;
  errorMessage = '';
  urlError = '';

  // Validation
  validationScore = 0;
  validationReasons: Array<{text: string, positive: boolean}> = [];

  constructor(private youtubeProcessor: YouTubeProcessorService) {}

  ngOnInit() {
    if (this.isOpen) {
      this.reset();
    }
  }

  validateUrl(url: string) {
    this.urlError = '';
    
    if (!url) {
      return;
    }

    if (!this.youtubeProcessor.isValidYouTubeUrl(url)) {
      this.urlError = 'Please enter a valid YouTube URL';
    }
  }

  get isValidUrl(): boolean {
    return !!this.youtubeUrl && !this.urlError;
  }

  async processUrl() {
    if (!this.isValidUrl) return;

    this.processing = true;
    this.hasError = false;
    this.processingMessage = 'Extracting video metadata...';

    try {
      const result = await this.youtubeProcessor.processYouTubeUrl(this.youtubeUrl).toPromise();
      
      if (result?.success && result.data) {
        this.videoData = result.data;
        this.processingMessage = 'Validating content...';
        
        // Validate for educational content
        const validation = this.youtubeProcessor.validateForEducation(this.videoData);
        this.validationScore = validation.score;
        this.validationReasons = validation.reasons.map(reason => ({
          text: reason,
          positive: false
        }));

        // Add positive reasons
        if (this.videoData.title.toLowerCase().includes('tutorial')) {
          this.validationReasons.push({text: 'Title contains educational keywords', positive: true});
        }
        if (this.videoData.description.length > 200) {
          this.validationReasons.push({text: 'Detailed description provided', positive: true});
        }

        this.processingMessage = 'Processing complete!';
        this.currentStep = 2;
      } else {
        throw new Error(result?.error || 'Failed to process video');
      }
    } catch (error: any) {
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
        return this.isValidUrl && !this.processing;
      case 2:
        return !!this.videoData;
      case 3:
        return this.validationScore >= 30; // Minimum score for approval
      default:
        return false;
    }
  }

  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
    } else {
      this.addToLesson();
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  addToLesson() {
    if (!this.videoData) return;

    const interactionConfig = this.youtubeProcessor.createVideoInteractionConfig(this.videoData, {
      startTime: this.startTime,
      endTime: this.endTime,
      autoplay: this.autoplay,
      controls: this.showControls
    });

    this.videoProcessed.emit({
      type: 'video_interaction',
      config: interactionConfig,
      videoData: this.videoData,
      validationScore: this.validationScore
    });

    this.close();
  }

  close() {
    this.isOpen = false;
    this.closed.emit();
    this.reset();
  }

  retry() {
    this.hasError = false;
    this.errorMessage = '';
    this.processing = false;
  }

  private reset() {
    this.currentStep = 1;
    this.youtubeUrl = '';
    this.videoData = undefined;
    this.startTime = undefined;
    this.endTime = undefined;
    this.autoplay = false;
    this.showControls = true;
    this.showRelated = false;
    this.processing = false;
    this.hasError = false;
    this.errorMessage = '';
    this.urlError = '';
    this.validationScore = 0;
    this.validationReasons = [];
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

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
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

  getApprovalClass(): string {
    if (this.validationScore >= 70) return 'approved';
    if (this.validationScore >= 40) return 'warning';
    return 'rejected';
  }

  getApprovalIcon(): string {
    if (this.validationScore >= 70) return '✅';
    if (this.validationScore >= 40) return '⚠️';
    return '❌';
  }

  getApprovalTitle(): string {
    if (this.validationScore >= 70) return 'Content Approved';
    if (this.validationScore >= 40) return 'Content Needs Review';
    return 'Content Rejected';
  }

  getApprovalMessage(): string {
    if (this.validationScore >= 70) return 'This video appears to be educational content and is approved for use.';
    if (this.validationScore >= 40) return 'This video may be educational but requires manual review.';
    return 'This video does not appear to be educational content.';
  }
}

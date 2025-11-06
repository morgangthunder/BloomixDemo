import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoPlayerInteractionComponent } from '../video-player-interaction/video-player-interaction.component';

@Component({
  selector: 'app-interaction-preview',
  standalone: true,
  imports: [CommonModule, VideoPlayerInteractionComponent],
  template: `
    <div class="interaction-preview">
      <div class="preview-header">
        <h3>🎬 Interaction Preview</h3>
        <div class="preview-controls">
          <button (click)="toggleFullscreen()" class="preview-btn">
            {{isFullscreen ? '⤓' : '⤢'}} {{isFullscreen ? 'Exit' : 'Fullscreen'}}
          </button>
          <button (click)="resetPreview()" class="preview-btn">
            🔄 Reset
          </button>
        </div>
      </div>

      <div class="preview-content" [class.fullscreen]="isFullscreen">
        <!-- Video Interaction Preview -->
        <div *ngIf="interactionType === 'video_player'" class="video-preview-container">
          <app-video-player-interaction
            [config]="videoConfig"
            [content]="videoContent"
            [isPreview]="true">
          </app-video-player-interaction>
        </div>

        <!-- Other Interaction Types -->
        <div *ngIf="interactionType !== 'video_player'" class="placeholder-preview">
          <div class="placeholder-icon">🎮</div>
          <h4>{{interactionType}} Interaction</h4>
          <p>Preview for {{interactionType}} interactions will be available soon.</p>
        </div>
      </div>

      <!-- Preview Info -->
      <div class="preview-info" *ngIf="!isFullscreen">
        <div class="info-section">
          <h4>Interaction Details</h4>
          <div class="info-item">
            <span class="label">Type:</span>
            <span class="value">{{interactionType}}</span>
          </div>
          <div class="info-item" *ngIf="videoConfig">
            <span class="label">Video ID:</span>
            <span class="value">{{videoConfig.videoId}}</span>
          </div>
          <div class="info-item" *ngIf="videoConfig?.startTime || videoConfig?.endTime">
            <span class="label">Time Range:</span>
            <span class="value">
              {{formatTime(videoConfig.startTime || 0)}} - {{formatTime(videoConfig.endTime || 0)}}
            </span>
          </div>
        </div>

        <div class="info-section">
          <h4>Student Experience</h4>
          <ul class="experience-list">
            <li *ngIf="videoConfig?.autoplay">Video will autoplay when student reaches this stage</li>
            <li *ngIf="videoConfig?.controls">Student can control playback (play/pause, seek, volume)</li>
            <li *ngIf="videoConfig?.startTime">Video starts at {{formatTime(videoConfig.startTime)}}</li>
            <li *ngIf="videoConfig?.endTime">Video ends at {{formatTime(videoConfig.endTime)}}</li>
            <li *ngIf="videoContent?.transcript">Transcript available for accessibility</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .interaction-preview {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .preview-header h3 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    
    .preview-controls {
      display: flex;
      gap: 8px;
    }
    
    .preview-btn {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }
    
    .preview-btn:hover {
      background: rgba(255,255,255,0.15);
    }
    
    .preview-content {
      position: relative;
      min-height: 300px;
    }
    
    .preview-content.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .video-preview-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .placeholder-preview {
      text-align: center;
      padding: 60px 20px;
      color: #9ca3af;
    }
    
    .placeholder-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .placeholder-preview h4 {
      color: white;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .placeholder-preview p {
      font-size: 14px;
      line-height: 1.5;
    }
    
    .preview-info {
      padding: 20px;
      background: rgba(255,255,255,0.03);
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    
    .info-section {
      margin-bottom: 20px;
    }
    
    .info-section:last-child {
      margin-bottom: 0;
    }
    
    .info-section h4 {
      color: white;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
    }
    
    .info-item:last-child {
      margin-bottom: 0;
    }
    
    .label {
      color: #9ca3af;
      font-weight: 500;
    }
    
    .value {
      color: white;
      font-weight: 600;
    }
    
    .experience-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .experience-list li {
      color: #d1d5db;
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 6px;
      padding-left: 16px;
      position: relative;
    }
    
    .experience-list li:before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: 600;
    }
    
    .experience-list li:last-child {
      margin-bottom: 0;
    }
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
      .preview-header {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }
      
      .preview-controls {
        justify-content: center;
      }
      
      .preview-info {
        padding: 16px;
      }
      
      .info-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `]
})
export class InteractionPreviewComponent implements OnInit {
  @Input() interactionType = 'video_player';
  @Input() videoConfig?: any;
  @Input() videoContent?: any;

  isFullscreen = false;

  ngOnInit() {
    // Initialize preview with default values if none provided
    if (!this.videoConfig && this.interactionType === 'video_player') {
      this.videoConfig = {
        videoId: 'dQw4w9WgXcQ', // Rick Roll for demo
        startTime: 0,
        endTime: 30,
        autoplay: false,
        controls: true,
        embedParams: {
          rel: 0,
          modestbranding: 1,
          controls: 1,
          playlist: 'dQw4w9WgXcQ'
        }
      };
    }

    if (!this.videoContent && this.interactionType === 'video_player') {
      this.videoContent = {
        title: 'Sample Video',
        description: 'This is a sample video for preview purposes.',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        duration: 212,
        channel: 'Sample Channel'
      };
    }
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    
    if (this.isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  resetPreview() {
    // Reset any interaction state
    console.log('[InteractionPreview] Resetting preview');
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}




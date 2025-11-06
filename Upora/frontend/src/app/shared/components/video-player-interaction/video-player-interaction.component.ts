import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface VideoInteractionConfig {
  videoId: string;
  startTime?: number; // seconds
  endTime?: number;   // seconds
  autoplay: boolean;
  controls: boolean;
  embedParams: {
    rel: number;           // 0 = no related videos
    modestbranding: number; // 1 = hide YouTube logo
    controls: number;      // 1 = show controls
    playlist?: string;     // For ad-blocking trick
  };
}

interface VideoContent {
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  channel: string;
  transcript?: string;
}

@Component({
  selector: 'app-video-player-interaction',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="video-interaction" [class.fullscreen]="isFullscreen">
      <!-- Video Container -->
      <div class="video-container" #videoContainer>
        <div class="video-wrapper">
          <iframe
            #videoFrame
            [src]="embedUrl"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            class="video-iframe">
          </iframe>
        </div>
        
        <!-- Video Overlay Controls -->
        <div class="video-overlay" *ngIf="showOverlay">
          <div class="video-info">
            <h3 class="video-title">{{content?.title || 'Loading...'}}</h3>
            <p class="video-description" *ngIf="content?.description">{{content?.description}}</p>
            <div class="video-meta">
              <span class="channel" *ngIf="content?.channel">{{content?.channel}}</span>
              <span class="duration">{{formatDuration(content?.duration || 0)}}</span>
            </div>
          </div>
          
          <!-- Time Range Display -->
          <div class="time-range" *ngIf="hasTimeRange()">
            <span class="time-label">Playing:</span>
            <span class="time-display">{{formatTime(config.startTime || 0)}} - {{formatTime(config.endTime || content?.duration || 0)}}</span>
          </div>
        </div>
      </div>

      <!-- Video Controls -->
      <div class="video-controls" *ngIf="!isFullscreen">
        <div class="control-group">
          <button 
            (click)="togglePlay()" 
            class="control-btn"
            [class.playing]="isPlaying">
            {{isPlaying ? '⏸️' : '▶️'}}
          </button>
          
          <button 
            (click)="toggleFullscreen()" 
            class="control-btn">
            {{isFullscreen ? '⤓' : '⤢'}}
          </button>
          
          <button 
            (click)="toggleMute()" 
            class="control-btn"
            [class.muted]="isMuted">
            {{isMuted ? '🔇' : '🔊'}}
          </button>
        </div>

        <!-- Progress Bar -->
        <div class="progress-container">
          <div class="progress-bar" (click)="seekTo($event)">
            <div class="progress-fill" [style.width.%]="progressPercentage"></div>
            <div class="progress-handle" [style.left.%]="progressPercentage"></div>
          </div>
          <div class="time-display">
            {{formatTime(currentTime)}} / {{formatTime(totalDuration)}}
          </div>
        </div>

      </div>

      <!-- Transcript Section -->
      <div class="transcript-section" *ngIf="content?.transcript && showTranscript">
        <div class="transcript-header">
          <h4>Transcript</h4>
          <button (click)="toggleTranscript()" class="toggle-btn">
            {{showTranscript ? 'Hide' : 'Show'}} Transcript
          </button>
        </div>
        <div class="transcript-content">
          <p>{{content?.transcript || 'No transcript available'}}</p>
        </div>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="hasError">
        <div class="error-icon">⚠️</div>
        <h3>Video Error</h3>
        <p>{{errorMessage}}</p>
        <button (click)="retry()" class="retry-btn">Retry</button>
      </div>
    </div>
  `,
  styles: [`
    .video-interaction {
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .video-interaction.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      max-width: none;
      border-radius: 0;
    }
    
    .video-container {
      position: relative;
      width: 100%;
      height: 0;
      padding-bottom: 56.25%; /* 16:9 aspect ratio */
      background: #000;
    }
    
    .video-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    
    .video-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    .video-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.7) 100%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .video-container:hover .video-overlay {
      opacity: 1;
    }
    
    .video-info {
      color: white;
    }
    
    .video-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    
    .video-description {
      font-size: 14px;
      color: #ccc;
      margin-bottom: 12px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .video-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #999;
    }
    
    .time-range {
      background: rgba(0,0,0,0.8);
      padding: 8px 12px;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      align-self: flex-start;
    }
    
    .time-label {
      color: #ccc;
      margin-right: 8px;
    }
    
    .video-controls {
      background: rgba(0,0,0,0.9);
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    
    .control-group {
      display: flex;
      gap: 8px;
    }
    
    .control-btn {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }
    
    .control-btn:hover {
      background: rgba(255,255,255,0.2);
    }
    
    .control-btn.playing {
      background: #ef4444;
    }
    
    .control-btn.muted {
      background: #ef4444;
    }
    
    .progress-container {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 200px;
    }
    
    .progress-bar {
      flex: 1;
      height: 6px;
      background: rgba(255,255,255,0.3);
      border-radius: 3px;
      cursor: pointer;
      position: relative;
    }
    
    .progress-fill {
      height: 100%;
      background: #ef4444;
      border-radius: 3px;
      transition: width 0.1s ease;
    }
    
    .progress-handle {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 12px;
      height: 12px;
      background: #ef4444;
      border-radius: 50%;
      border: 2px solid white;
      cursor: pointer;
    }
    
    .time-display {
      color: #ccc;
      font-size: 12px;
      white-space: nowrap;
    }
    
    .speed-control {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ccc;
      font-size: 12px;
    }
    
    .speed-select {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .transcript-section {
      background: rgba(255,255,255,0.05);
      border-top: 1px solid rgba(255,255,255,0.1);
      padding: 20px;
    }
    
    .transcript-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .transcript-header h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    
    .toggle-btn {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .transcript-content {
      color: #d1d5db;
      line-height: 1.6;
      font-size: 14px;
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
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
      .video-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      
      .control-group {
        justify-content: center;
      }
      
      .progress-container {
        min-width: auto;
      }
      
      .speed-control {
        justify-content: center;
      }
    }
  `]
})
export class VideoPlayerInteractionComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() config!: VideoInteractionConfig;
  @Input() content?: VideoContent;
  @Input() isPreview = false;

  @ViewChild('videoFrame') videoFrame!: ElementRef<HTMLIFrameElement>;
  @ViewChild('videoContainer') videoContainer!: ElementRef<HTMLDivElement>;

  // Video state
  isPlaying = false;
  isMuted = false;
  isFullscreen = false;
  currentTime = 0;
  totalDuration = 0;
  progressPercentage = 0;
  showOverlay = false;
  showTranscript = false;

  // Error handling
  hasError = false;
  errorMessage = '';

  // YouTube API
  private youtubeAPI: any;
  private player: any;

  constructor() {}

  ngOnInit() {
    this.loadYouTubeAPI();
  }

  ngAfterViewInit() {
    if (this.isPreview) {
      this.setupPreviewMode();
    }
  }

  ngOnDestroy() {
    if (this.player) {
      this.player.destroy();
    }
  }

  get embedUrl(): string {
    if (!this.config?.videoId) return '';
    
    const params = new URLSearchParams({
      autoplay: this.config.autoplay ? '1' : '0',
      controls: this.config.controls ? '1' : '0',
      rel: this.config.embedParams.rel.toString(),
      modestbranding: this.config.embedParams.modestbranding.toString(),
      playlist: this.config.videoId, // Ad-blocking trick
    });

    // Add start/end times if specified
    if (this.config.startTime) {
      params.set('start', this.config.startTime.toString());
    }
    if (this.config.endTime) {
      params.set('end', this.config.endTime.toString());
    }

    return `https://www.youtube.com/embed/${this.config.videoId}?${params.toString()}`;
  }

  hasTimeRange(): boolean {
    return !!(this.config.startTime || this.config.endTime);
  }

  private loadYouTubeAPI() {
    if (typeof window !== 'undefined' && !(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }

  private setupPreviewMode() {
    // In preview mode, we might want to show a static thumbnail
    // or a simplified player for testing
    console.log('[VideoPlayer] Preview mode setup');
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    // YouTube iframe API would be used here
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    
    if (this.isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  seekTo(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * this.totalDuration;
    
    this.currentTime = newTime;
    this.updateProgress();
  }


  toggleTranscript() {
    this.showTranscript = !this.showTranscript;
  }

  retry() {
    this.hasError = false;
    this.errorMessage = '';
    // Reload the iframe
    const iframe = this.videoFrame.nativeElement;
    iframe.src = iframe.src;
  }

  private updateProgress() {
    this.progressPercentage = (this.currentTime / this.totalDuration) * 100;
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  formatDuration(seconds: number): string {
    return this.formatTime(seconds);
  }
}

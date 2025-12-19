import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';

interface VideoUrlConfig {
  autoplay?: boolean;
  loop?: boolean;
  showControls?: boolean;
  defaultVolume?: number;
  startTime?: number;
  endTime?: number;
  hideOverlayDuringPlayback?: boolean;
  showCaptions?: boolean;
  videoQuality?: 'auto' | 'hd1080' | 'hd720' | 'medium' | 'small';
  provider?: 'youtube' | 'vimeo';
  videoId?: string;
  videoUrl?: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    Vimeo: any;
  }
}

@Component({
  selector: 'app-video-url-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="video-url-player-wrapper" [class.has-overlay]="hasOverlay">
      <!-- Video Player Container -->
      <div class="player-container">
        <!-- YouTube Player -->
        <div *ngIf="config?.provider === 'youtube' && config?.videoId" 
             #youtubePlayerContainer
             class="youtube-player-container">
          <div #youtubePlayer class="youtube-player"></div>
        </div>

        <!-- Vimeo Player -->
        <div *ngIf="config?.provider === 'vimeo' && config?.videoId" 
             #vimeoPlayerContainer
             class="vimeo-player-container">
          <iframe
            #vimeoPlayer
            [src]="getVimeoEmbedUrl()"
            frameborder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen
            class="vimeo-player">
          </iframe>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading video...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="error-state">
          <p>{{error}}</p>
        </div>

        <!-- Overlay Container (for SDK interactions) -->
        <div *ngIf="hasOverlay" 
             #overlayContainer
             class="overlay-container" 
             [class.media-playing]="(isPlaying && (config?.hideOverlayDuringPlayback ?? true)) || overlayHiddenBySDK"
             [innerHTML]="sanitizedOverlayHtml"></div>
      </div>
    </div>
  `,
  styles: [`
    .video-url-player-wrapper {
      position: relative;
      width: 100%;
      background: #000;
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .player-container {
      position: relative;
      width: 100%;
      padding-bottom: 56.25%; /* 16:9 aspect ratio */
      height: 0;
      overflow: hidden;
    }

    .youtube-player-container,
    .vimeo-player-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .youtube-player {
      width: 100%;
      height: 100%;
    }

    .vimeo-player {
      width: 100%;
      height: 100%;
      border: none;
    }

    .loading-state,
    .error-state {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      text-align: center;
      z-index: 10;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: #00d4ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .overlay-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 100;
      transition: opacity 0.3s ease;
    }

    .overlay-container ::ng-deep * {
      pointer-events: auto;
    }

    /* Hide only text content when media is playing, but keep buttons visible */
    .overlay-container.media-playing ::ng-deep p:not(button p),
    .overlay-container.media-playing ::ng-deep span:not(button span):not(input + span):not(button *),
    .overlay-container.media-playing ::ng-deep div:not(.button-container):not([class*="button"]):not([id*="button"]):not(button div),
    .overlay-container.media-playing ::ng-deep h1,
    .overlay-container.media-playing ::ng-deep h2,
    .overlay-container.media-playing ::ng-deep h3,
    .overlay-container.media-playing ::ng-deep h4,
    .overlay-container.media-playing ::ng-deep h5,
    .overlay-container.media-playing ::ng-deep h6 {
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    /* Always keep buttons and interactive elements visible */
    .overlay-container ::ng-deep button,
    .overlay-container ::ng-deep input[type="button"],
    .overlay-container ::ng-deep input[type="submit"],
    .overlay-container ::ng-deep select,
    .overlay-container ::ng-deep [role="button"],
    .overlay-container ::ng-deep [onclick],
    .overlay-container ::ng-deep .button-container,
    .overlay-container ::ng-deep [class*="button"],
    .overlay-container ::ng-deep [id*="button"],
    .overlay-container ::ng-deep button * {
      opacity: 1 !important;
      pointer-events: auto !important;
      display: block !important;
    }
  `]
})
export class VideoUrlPlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: VideoUrlConfig | null = null;
  @Input() overlayHtml: string = '';
  @Input() overlayCss: string = '';
  @Input() overlayJs: string = '';

  @Output() videoLoaded = new EventEmitter<{
    duration: number;
    provider: string;
    videoId: string;
  }>();
  @Output() timeUpdate = new EventEmitter<number>();
  @Output() playEvent = new EventEmitter<void>();
  @Output() pauseEvent = new EventEmitter<void>();
  @Output() endedEvent = new EventEmitter<void>();
  @Output() errorEvent = new EventEmitter<string>();

  @ViewChild('youtubePlayer', { static: false }) youtubePlayerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('vimeoPlayer', { static: false }) vimeoPlayerRef?: ElementRef<HTMLIFrameElement>;
  @ViewChild('overlayContainer', { static: false }) overlayContainerRef?: ElementRef<HTMLDivElement>;

  hasOverlay = false;
  isPlaying = false;
  loading = true;
  error: string | null = null;
  private overlayScriptElement: HTMLScriptElement | null = null;
  sanitizedOverlayHtml: SafeHtml = '';
  overlayHiddenBySDK: boolean = false;
  private showOverlayHandler: (() => void) | null = null;
  private hideOverlayHandler: (() => void) | null = null;

  // YouTube Player API
  private youtubePlayer: any = null;
  private youtubeApiReady = false;

  // Vimeo Player API
  private vimeoPlayer: any = null;
  private vimeoApiReady = false;

  constructor(private domSanitizer: DomSanitizer) {}

  ngOnInit() {
    console.log('[VideoUrlPlayer] 🎬 ngOnInit - provider:', this.config?.provider, 'videoId:', this.config?.videoId);
    this.hasOverlay = !!(this.overlayHtml || this.overlayCss || this.overlayJs);
    if (this.overlayHtml) {
      this.sanitizedOverlayHtml = this.domSanitizer.bypassSecurityTrustHtml(this.overlayHtml);
    }
    
    // Listen for show/hide overlay HTML events from SDK
    this.showOverlayHandler = () => {
      console.log('[VideoUrlPlayer] 📢 Received interaction-show-overlay-html event');
      this.showOverlayHtml();
    };
    this.hideOverlayHandler = () => {
      console.log('[VideoUrlPlayer] 📢 Received interaction-hide-overlay-html event');
      this.hideOverlayHtml();
    };
    
    window.addEventListener('interaction-show-overlay-html', this.showOverlayHandler);
    window.addEventListener('interaction-hide-overlay-html', this.hideOverlayHandler);
    console.log('[VideoUrlPlayer] ✅ Event listeners registered for show/hide overlay');
  }

  ngAfterViewInit() {
    console.log('[VideoUrlPlayer] 🎬 ngAfterViewInit - provider:', this.config?.provider, 'videoId:', this.config?.videoId);
    
    if (this.config?.provider === 'youtube' && this.config?.videoId) {
      this.loadYouTubePlayer();
    } else if (this.config?.provider === 'vimeo' && this.config?.videoId) {
      this.loadVimeoPlayer();
    }
    
    if (this.hasOverlay && this.overlayCss) {
      this.injectOverlayStyles();
    }
    if (this.hasOverlay && this.overlayJs) {
      this.injectOverlayScript();
    }
  }

  ngOnDestroy() {
    if (this.youtubePlayer) {
      try {
        this.youtubePlayer.destroy();
      } catch (e) {
        console.warn('[VideoUrlPlayer] Error destroying YouTube player:', e);
      }
    }
    
    if (this.vimeoPlayer) {
      try {
        this.vimeoPlayer.destroy();
      } catch (e) {
        console.warn('[VideoUrlPlayer] Error destroying Vimeo player:', e);
      }
    }
    
    if (this.overlayScriptElement) {
      this.overlayScriptElement.remove();
    }
    
    if (this.showOverlayHandler) {
      window.removeEventListener('interaction-show-overlay-html', this.showOverlayHandler);
    }
    if (this.hideOverlayHandler) {
      window.removeEventListener('interaction-hide-overlay-html', this.hideOverlayHandler);
    }
  }

  getVimeoEmbedUrl(): SafeResourceUrl {
    if (!this.config?.videoId) {
      return this.domSanitizer.bypassSecurityTrustResourceUrl('');
    }
    
    let url = `https://player.vimeo.com/video/${this.config.videoId}`;
    const params: string[] = [];
    
    if (this.config.autoplay) {
      params.push('autoplay=1');
    }
    if (this.config.loop) {
      params.push('loop=1');
    }
    if (this.config.showCaptions) {
      params.push('texttrack=1');
    }
    if (this.config.startTime) {
      params.push(`#t=${this.config.startTime}`);
    }
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private loadYouTubePlayer() {
    console.log('[VideoUrlPlayer] 🎬 Loading YouTube player for video:', this.config?.videoId);
    
    // Check if YouTube API is already loaded
    if (window.YT && window.YT.Player) {
      this.youtubeApiReady = true;
      this.createYouTubePlayer();
      return;
    }
    
    // Load YouTube IFrame API
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
    
    // Set up callback
    window.onYouTubeIframeAPIReady = () => {
      console.log('[VideoUrlPlayer] ✅ YouTube IFrame API ready');
      this.youtubeApiReady = true;
      this.createYouTubePlayer();
    };
    
    // If API is already loaded, create player immediately
    if (window.YT && window.YT.Player) {
      this.youtubeApiReady = true;
      setTimeout(() => this.createYouTubePlayer(), 100);
    }
  }

  private createYouTubePlayer() {
    if (!this.youtubePlayerRef?.nativeElement || !this.config?.videoId) {
      console.warn('[VideoUrlPlayer] ⚠️ YouTube player container or videoId not available');
      return;
    }
    
    try {
      this.youtubePlayer = new window.YT.Player(this.youtubePlayerRef.nativeElement, {
        videoId: this.config.videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: this.config.autoplay ? 1 : 0,
          loop: this.config.loop ? 1 : 0,
          controls: this.config.showControls !== false ? 1 : 0,
          start: this.config.startTime || 0,
          end: this.config.endTime,
          cc_load_policy: this.config.showCaptions ? 1 : 0,
          iv_load_policy: 3, // Hide annotations
          rel: 0, // Don't show related videos
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            console.log('[VideoUrlPlayer] ✅ YouTube player ready');
            this.loading = false;
            this.error = null;
            
            const duration = event.target.getDuration();
            this.videoLoaded.emit({
              duration,
              provider: 'youtube',
              videoId: this.config!.videoId!,
            });
            
            // Set volume
            if (this.config?.defaultVolume !== undefined) {
              event.target.setVolume(this.config.defaultVolume * 100);
            }
            
            // Seek to start time if specified
            if (this.config?.startTime) {
              event.target.seekTo(this.config.startTime, true);
            }
          },
          onStateChange: (event: any) => {
            const state = event.data;
            console.log('[VideoUrlPlayer] 🎬 YouTube player state changed:', state);
            
            // YT.PlayerState.PLAYING = 1
            // YT.PlayerState.PAUSED = 2
            // YT.PlayerState.ENDED = 0
            
            if (state === 1) { // Playing
              this.isPlaying = true;
              this.playEvent.emit();
              this.startTimeUpdateInterval();
            } else if (state === 2) { // Paused
              this.isPlaying = false;
              this.pauseEvent.emit();
              this.stopTimeUpdateInterval();
            } else if (state === 0) { // Ended
              this.isPlaying = false;
              this.endedEvent.emit();
              this.stopTimeUpdateInterval();
            }
          },
          onError: (event: any) => {
            console.error('[VideoUrlPlayer] ❌ YouTube player error:', event.data);
            this.loading = false;
            this.error = `YouTube player error: ${event.data}`;
            this.errorEvent.emit(this.error);
          },
        },
      });
    } catch (error: any) {
      console.error('[VideoUrlPlayer] ❌ Failed to create YouTube player:', error);
      this.loading = false;
      this.error = `Failed to create YouTube player: ${error.message}`;
      this.errorEvent.emit(this.error);
    }
  }

  private loadVimeoPlayer() {
    console.log('[VideoUrlPlayer] 🎬 Loading Vimeo player for video:', this.config?.videoId);
    
    // Check if Vimeo API is already loaded
    if (window.Vimeo && window.Vimeo.Player) {
      this.vimeoApiReady = true;
      this.createVimeoPlayer();
      return;
    }
    
    // Load Vimeo Player API
    if (!document.querySelector('script[src*="player.vimeo.com/api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://player.vimeo.com/api/player.js';
      tag.onload = () => {
        console.log('[VideoUrlPlayer] ✅ Vimeo Player API ready');
        this.vimeoApiReady = true;
        this.createVimeoPlayer();
      };
      document.head.appendChild(tag);
    } else {
      // API already loading or loaded
      setTimeout(() => {
        if (window.Vimeo && window.Vimeo.Player) {
          this.vimeoApiReady = true;
          this.createVimeoPlayer();
        }
      }, 500);
    }
  }

  private createVimeoPlayer() {
    if (!this.vimeoPlayerRef?.nativeElement || !this.config?.videoId) {
      console.warn('[VideoUrlPlayer] ⚠️ Vimeo player iframe or videoId not available');
      return;
    }
    
    try {
      this.vimeoPlayer = new window.Vimeo.Player(this.vimeoPlayerRef.nativeElement);
      
      // Set up event listeners
      this.vimeoPlayer.on('loaded', () => {
        console.log('[VideoUrlPlayer] ✅ Vimeo player loaded');
        this.loading = false;
        this.error = null;
        
        this.vimeoPlayer.getDuration().then((duration: number) => {
          this.videoLoaded.emit({
            duration,
            provider: 'vimeo',
            videoId: this.config!.videoId!,
          });
        });
        
        // Set volume
        if (this.config?.defaultVolume !== undefined) {
          this.vimeoPlayer.setVolume(this.config.defaultVolume);
        }
        
        // Seek to start time if specified
        if (this.config?.startTime) {
          this.vimeoPlayer.setCurrentTime(this.config.startTime);
        }
      });
      
      this.vimeoPlayer.on('play', () => {
        console.log('[VideoUrlPlayer] ▶️ Vimeo player playing');
        this.isPlaying = true;
        this.playEvent.emit();
        this.startTimeUpdateInterval();
      });
      
      this.vimeoPlayer.on('pause', () => {
        console.log('[VideoUrlPlayer] ⏸️ Vimeo player paused');
        this.isPlaying = false;
        this.pauseEvent.emit();
        this.stopTimeUpdateInterval();
      });
      
      this.vimeoPlayer.on('ended', () => {
        console.log('[VideoUrlPlayer] ⏹️ Vimeo player ended');
        this.isPlaying = false;
        this.endedEvent.emit();
        this.stopTimeUpdateInterval();
      });
      
      this.vimeoPlayer.on('error', (error: any) => {
        console.error('[VideoUrlPlayer] ❌ Vimeo player error:', error);
        this.loading = false;
        this.error = `Vimeo player error: ${error.message || 'Unknown error'}`;
        this.errorEvent.emit(this.error);
      });
      
    } catch (error: any) {
      console.error('[VideoUrlPlayer] ❌ Failed to create Vimeo player:', error);
      this.loading = false;
      this.error = `Failed to create Vimeo player: ${error.message}`;
      this.errorEvent.emit(this.error);
    }
  }

  private timeUpdateInterval: any = null;

  private startTimeUpdateInterval() {
    this.stopTimeUpdateInterval();
    this.timeUpdateInterval = setInterval(() => {
      this.updateCurrentTime();
    }, 250); // Update 4 times per second
  }

  private stopTimeUpdateInterval() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  private updateCurrentTime() {
    if (this.config?.provider === 'youtube' && this.youtubePlayer) {
      try {
        const currentTime = this.youtubePlayer.getCurrentTime();
        this.timeUpdate.emit(currentTime);
      } catch (e) {
        // Player might not be ready
      }
    } else if (this.config?.provider === 'vimeo' && this.vimeoPlayer) {
      this.vimeoPlayer.getCurrentTime().then((currentTime: number) => {
        this.timeUpdate.emit(currentTime);
      }).catch(() => {
        // Player might not be ready
      });
    }
  }

  // Public methods for SDK control
  playVideoUrl(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.config?.provider === 'youtube' && this.youtubePlayer) {
        try {
          this.youtubePlayer.playVideo();
          resolve(true);
        } catch (e) {
          console.error('[VideoUrlPlayer] Error playing YouTube video:', e);
          resolve(false);
        }
      } else if (this.config?.provider === 'vimeo' && this.vimeoPlayer) {
        this.vimeoPlayer.play().then(() => {
          resolve(true);
        }).catch((error: any) => {
          console.error('[VideoUrlPlayer] Error playing Vimeo video:', error);
          resolve(false);
        });
      } else {
        resolve(false);
      }
    });
  }

  pauseVideoUrl(): void {
    if (this.config?.provider === 'youtube' && this.youtubePlayer) {
      try {
        this.youtubePlayer.pauseVideo();
      } catch (e) {
        console.error('[VideoUrlPlayer] Error pausing YouTube video:', e);
      }
    } else if (this.config?.provider === 'vimeo' && this.vimeoPlayer) {
      this.vimeoPlayer.pause().catch((error: any) => {
        console.error('[VideoUrlPlayer] Error pausing Vimeo video:', error);
      });
    }
  }

  seekVideoUrl(time: number): void {
    if (this.config?.provider === 'youtube' && this.youtubePlayer) {
      try {
        this.youtubePlayer.seekTo(time, true);
      } catch (e) {
        console.error('[VideoUrlPlayer] Error seeking YouTube video:', e);
      }
    } else if (this.config?.provider === 'vimeo' && this.vimeoPlayer) {
      this.vimeoPlayer.setCurrentTime(time).catch((error: any) => {
        console.error('[VideoUrlPlayer] Error seeking Vimeo video:', error);
      });
    }
  }

  setVideoUrlVolume(volume: number): void {
    // Volume is 0.0 to 1.0
    if (this.config?.provider === 'youtube' && this.youtubePlayer) {
      try {
        this.youtubePlayer.setVolume(volume * 100); // YouTube uses 0-100
      } catch (e) {
        console.error('[VideoUrlPlayer] Error setting YouTube volume:', e);
      }
    } else if (this.config?.provider === 'vimeo' && this.vimeoPlayer) {
      this.vimeoPlayer.setVolume(volume).catch((error: any) => {
        console.error('[VideoUrlPlayer] Error setting Vimeo volume:', error);
      });
    }
  }

  getVideoUrlCurrentTime(): Promise<number> {
    return new Promise((resolve) => {
      if (this.config?.provider === 'youtube' && this.youtubePlayer) {
        try {
          const currentTime = this.youtubePlayer.getCurrentTime();
          resolve(currentTime);
        } catch (e) {
          console.error('[VideoUrlPlayer] Error getting YouTube current time:', e);
          resolve(0);
        }
      } else if (this.config?.provider === 'vimeo' && this.vimeoPlayer) {
        this.vimeoPlayer.getCurrentTime().then((currentTime: number) => {
          resolve(currentTime);
        }).catch(() => {
          resolve(0);
        });
      } else {
        resolve(0);
      }
    });
  }

  getVideoUrlDuration(): Promise<number> {
    return new Promise((resolve) => {
      if (this.config?.provider === 'youtube' && this.youtubePlayer) {
        try {
          const duration = this.youtubePlayer.getDuration();
          resolve(duration);
        } catch (e) {
          console.error('[VideoUrlPlayer] Error getting YouTube duration:', e);
          resolve(0);
        }
      } else if (this.config?.provider === 'vimeo' && this.vimeoPlayer) {
        this.vimeoPlayer.getDuration().then((duration: number) => {
          resolve(duration);
        }).catch(() => {
          resolve(0);
        });
      } else {
        resolve(0);
      }
    });
  }

  isVideoUrlPlaying(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.config?.provider === 'youtube' && this.youtubePlayer) {
        try {
          const state = this.youtubePlayer.getPlayerState();
          resolve(state === 1); // YT.PlayerState.PLAYING
        } catch (e) {
          console.error('[VideoUrlPlayer] Error getting YouTube playing state:', e);
          resolve(false);
        }
      } else if (this.config?.provider === 'vimeo' && this.vimeoPlayer) {
        this.vimeoPlayer.getPaused().then((paused: boolean) => {
          resolve(!paused);
        }).catch(() => {
          resolve(false);
        });
      } else {
        resolve(false);
      }
    });
  }

  showOverlayHtml(): void {
    console.log('[VideoUrlPlayer] 🔧 showOverlayHtml() called');
    this.overlayHiddenBySDK = false;
    
    setTimeout(() => {
      let overlayContainer: HTMLElement | null = null;
      
      if (this.overlayContainerRef?.nativeElement) {
        overlayContainer = this.overlayContainerRef.nativeElement;
      } else {
        overlayContainer = document.querySelector('.overlay-container') as HTMLElement;
      }
      
      if (overlayContainer) {
        overlayContainer.classList.remove('media-playing');
        console.log('[VideoUrlPlayer] ✅ Overlay HTML shown via SDK');
      }
    }, 0);
  }

  hideOverlayHtml(): void {
    console.log('[VideoUrlPlayer] 🔧 hideOverlayHtml() called');
    this.overlayHiddenBySDK = true;
    
    setTimeout(() => {
      let overlayContainer: HTMLElement | null = null;
      
      if (this.overlayContainerRef?.nativeElement) {
        overlayContainer = this.overlayContainerRef.nativeElement;
      } else {
        overlayContainer = document.querySelector('.overlay-container') as HTMLElement;
      }
      
      if (overlayContainer) {
        overlayContainer.classList.add('media-playing');
        console.log('[VideoUrlPlayer] ✅ Overlay HTML hidden via SDK');
      }
    }, 0);
  }

  private injectOverlayStyles() {
    if (!this.overlayCss) return;
    
    const styleId = 'video-url-player-overlay-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = this.overlayCss;
  }

  private injectOverlayScript() {
    if (!this.overlayJs) return;
    
    // Remove existing script if any
    if (this.overlayScriptElement) {
      this.overlayScriptElement.remove();
    }
    
    // Create new script element
    this.overlayScriptElement = document.createElement('script');
    this.overlayScriptElement.textContent = this.overlayJs;
    
    // Inject into overlay container or head
    setTimeout(() => {
      if (this.overlayContainerRef?.nativeElement) {
        this.overlayContainerRef.nativeElement.appendChild(this.overlayScriptElement!);
      } else {
        document.head.appendChild(this.overlayScriptElement!);
      }
      console.log('[VideoUrlPlayer] ✅ Overlay script injected');
    }, 100);
  }
}




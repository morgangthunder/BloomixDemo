import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface MediaConfig {
  autoplay?: boolean;
  loop?: boolean;
  showControls?: boolean;
  defaultVolume?: number;
  startTime?: number;
  endTime?: number;
  hideOverlayDuringPlayback?: boolean; // Hide HTML content (text, headers) during playback, but keep buttons visible
}

@Component({
  selector: 'app-media-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="media-player-wrapper" [class.has-overlay]="hasOverlay">
      <!-- Media Element Container -->
      <div class="media-container">
        <!-- Video Player -->
        <video
          *ngIf="mediaType === 'video'"
          #mediaElement
          [src]="mediaUrl"
          [autoplay]="config?.autoplay ?? false"
          [loop]="config?.loop ?? false"
          [controls]="false"
          [volume]="config?.defaultVolume ?? 1"
          class="media-element"
          (loadedmetadata)="onMediaLoaded()"
          (timeupdate)="onTimeUpdate()"
          (play)="onPlay()"
          (pause)="onPause()"
          (ended)="onEnded()"
          (error)="onError($event)">
          Your browser does not support the video tag.
        </video>

        <!-- Audio Player -->
        <audio
          *ngIf="mediaType === 'audio'"
          #mediaElement
          [src]="mediaUrl"
          [autoplay]="config?.autoplay ?? false"
          [loop]="config?.loop ?? false"
          [controls]="false"
          [volume]="config?.defaultVolume ?? 1"
          class="media-element"
          (loadedmetadata)="onMediaLoaded()"
          (timeupdate)="onTimeUpdate()"
          (play)="onPlay()"
          (pause)="onPause()"
          (ended)="onEnded()"
          (error)="onError($event)">
          Your browser does not support the audio tag.
        </audio>

        <!-- Overlay Container (for SDK interactions) -->
        <div *ngIf="hasOverlay" 
             #overlayContainer
             class="overlay-container" 
             [class.media-playing]="(mediaIsPlaying && (config?.hideOverlayDuringPlayback ?? true)) || overlayHiddenBySDK"
             [innerHTML]="sanitizedOverlayHtml"></div>
      </div>
    </div>
  `,
  styles: [`
    .media-player-wrapper {
      position: relative;
      width: 100%;
      background: #000;
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .media-container {
      position: relative;
      width: 100%;
    }

    .media-element {
      width: 100%;
      height: auto;
      display: block;
    }

    video.media-element {
      max-height: 90vh;
      object-fit: contain;
    }

    audio.media-element {
      width: 100%;
      padding: 1rem;
      background: #1a1a1a;
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

    /* Hide only text content (like "Initializing..." and titles) when media is playing, but keep buttons visible */
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

    /* Always keep buttons and interactive elements visible - use higher specificity */
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

    .has-overlay .media-element {
      /* Ensure media is still visible behind overlay */
    }
  `]
})
export class MediaPlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() mediaUrl: string = '';
  @Input() mediaType: 'video' | 'audio' = 'video';
  @Input() config: MediaConfig | null = null;
  @Input() overlayHtml: string = '';
  @Input() overlayCss: string = '';
  @Input() overlayJs: string = '';

  @Output() mediaLoaded = new EventEmitter<{
    duration: number;
    width?: number;
    height?: number;
  }>();
  @Output() timeUpdate = new EventEmitter<number>();
  @Output() playEvent = new EventEmitter<void>();
  @Output() pauseEvent = new EventEmitter<void>();
  @Output() endedEvent = new EventEmitter<void>();
  @Output() errorEvent = new EventEmitter<string>();

  @ViewChild('mediaElement') mediaElementRef!: ElementRef<HTMLVideoElement | HTMLAudioElement>;
  @ViewChild('overlayContainer', { static: false }) overlayContainerRef?: ElementRef<HTMLDivElement>;

  hasOverlay = false;
  mediaIsPlaying = false; // Track if media is currently playing (for overlay visibility)
  private overlayScriptElement: HTMLScriptElement | null = null;
  sanitizedOverlayHtml: SafeHtml = '';
  overlayHiddenBySDK: boolean = false; // Public so template can access it
  private showOverlayHandler: (() => void) | null = null;
  private hideOverlayHandler: (() => void) | null = null;

  constructor(private domSanitizer: DomSanitizer) {}

  ngOnInit() {
    this.hasOverlay = !!(this.overlayHtml || this.overlayCss || this.overlayJs);
    if (this.overlayHtml) {
      // Use bypassSecurityTrustHtml since overlay content is trusted (from interaction builder)
      // This preserves id attributes and other HTML that sanitize would strip
      this.sanitizedOverlayHtml = this.domSanitizer.bypassSecurityTrustHtml(this.overlayHtml);
    }
    
    // Listen for show/hide overlay HTML events from SDK
    this.showOverlayHandler = () => {
      console.log('[MediaPlayer] 📢 Received interaction-show-overlay-html event');
      this.showOverlayHtml();
    };
    this.hideOverlayHandler = () => {
      console.log('[MediaPlayer] 📢 Received interaction-hide-overlay-html event');
      this.hideOverlayHtml();
    };
    
    window.addEventListener('interaction-show-overlay-html', this.showOverlayHandler);
    window.addEventListener('interaction-hide-overlay-html', this.hideOverlayHandler);
    console.log('[MediaPlayer] ✅ Event listeners registered for show/hide overlay');
  }

  ngAfterViewInit() {
    console.log('[MediaPlayer] ngAfterViewInit - hasOverlay:', this.hasOverlay, 'overlayHtml length:', this.overlayHtml?.length || 0);
    if (this.hasOverlay && this.overlayCss) {
      this.injectOverlayStyles();
    }
    if (this.hasOverlay && this.overlayJs) {
      this.injectOverlayScript();
    }
    if (this.config?.startTime !== undefined) {
      this.seekTo(this.config.startTime);
    }
    
    // Log overlay container after a short delay to see if it's rendered
    setTimeout(() => {
      const overlayContainer = document.querySelector('.overlay-container');
      console.log('[MediaPlayer] Overlay container found:', !!overlayContainer);
      if (overlayContainer) {
        console.log('[MediaPlayer] Overlay container HTML:', overlayContainer.innerHTML.substring(0, 200));
        const buttons = overlayContainer.querySelectorAll('button');
        console.log('[MediaPlayer] Buttons found in overlay:', buttons.length);
      }
    }, 500);
  }

  ngOnDestroy() {
    if (this.overlayScriptElement) {
      this.overlayScriptElement.remove();
    }
    
    // Remove event listeners
    if (this.showOverlayHandler) {
      window.removeEventListener('interaction-show-overlay-html', this.showOverlayHandler);
    }
    if (this.hideOverlayHandler) {
      window.removeEventListener('interaction-hide-overlay-html', this.hideOverlayHandler);
    }
  }

  /**
   * Show overlay HTML content (called by SDK)
   */
  showOverlayHtml(): void {
    console.log('[MediaPlayer] 🔧 showOverlayHtml() called, overlayHiddenBySDK was:', this.overlayHiddenBySDK);
    this.overlayHiddenBySDK = false;
    console.log('[MediaPlayer] 🔧 overlayHiddenBySDK set to:', this.overlayHiddenBySDK);
    
    // Use ViewChild reference if available, otherwise fall back to querySelector
    setTimeout(() => {
      let overlayContainer: HTMLElement | null = null;
      
      // Try ViewChild reference first
      if (this.overlayContainerRef?.nativeElement) {
        overlayContainer = this.overlayContainerRef.nativeElement;
        console.log('[MediaPlayer] ✅ Found overlay container via ViewChild');
      } else {
        // Fall back to querySelector
        overlayContainer = document.querySelector('.overlay-container') as HTMLElement;
        if (!overlayContainer) {
          // Try finding it within the media player wrapper
          const wrapper = document.querySelector('.media-player-wrapper');
          if (wrapper) {
            overlayContainer = wrapper.querySelector('.overlay-container') as HTMLElement;
          }
        }
      }
      
      if (overlayContainer) {
        overlayContainer.classList.remove('media-playing');
        console.log('[MediaPlayer] ✅ Overlay HTML shown via SDK - media-playing class removed');
        console.log('[MediaPlayer] 🔍 Overlay container classes:', overlayContainer.className);
      } else {
        console.warn('[MediaPlayer] ⚠️ Overlay container not found');
        console.warn('[MediaPlayer] 🔍 Available .overlay-container elements:', document.querySelectorAll('.overlay-container').length);
      }
    }, 0);
  }

  /**
   * Hide overlay HTML content (called by SDK)
   */
  hideOverlayHtml(): void {
    console.log('[MediaPlayer] 🔧 hideOverlayHtml() called, overlayHiddenBySDK was:', this.overlayHiddenBySDK);
    this.overlayHiddenBySDK = true;
    console.log('[MediaPlayer] 🔧 overlayHiddenBySDK set to:', this.overlayHiddenBySDK);
    
    // Use ViewChild reference if available, otherwise fall back to querySelector
    setTimeout(() => {
      let overlayContainer: HTMLElement | null = null;
      
      // Try ViewChild reference first
      if (this.overlayContainerRef?.nativeElement) {
        overlayContainer = this.overlayContainerRef.nativeElement;
        console.log('[MediaPlayer] ✅ Found overlay container via ViewChild');
      } else {
        // Fall back to querySelector
        overlayContainer = document.querySelector('.overlay-container') as HTMLElement;
        if (!overlayContainer) {
          // Try finding it within the media player wrapper
          const wrapper = document.querySelector('.media-player-wrapper');
          if (wrapper) {
            overlayContainer = wrapper.querySelector('.overlay-container') as HTMLElement;
          }
        }
      }
      
      if (overlayContainer) {
        overlayContainer.classList.add('media-playing');
        console.log('[MediaPlayer] ✅ Overlay HTML hidden via SDK - media-playing class added');
        console.log('[MediaPlayer] 🔍 Overlay container classes:', overlayContainer.className);
      } else {
        console.warn('[MediaPlayer] ⚠️ Overlay container not found');
        console.warn('[MediaPlayer] 🔍 Available .overlay-container elements:', document.querySelectorAll('.overlay-container').length);
      }
    }, 0);
  }

  private injectOverlayStyles() {
    const styleId = 'media-player-overlay-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = this.overlayCss;
  }

  private injectOverlayScript() {
    // Remove existing script if any
    if (this.overlayScriptElement) {
      this.overlayScriptElement.remove();
    }

    // Wait for overlay HTML to be rendered before injecting script
    // This ensures the elements with IDs exist when the script runs
    setTimeout(() => {
      // Create new script element
      this.overlayScriptElement = document.createElement('script');
      this.overlayScriptElement.textContent = this.overlayJs;
      
      // Inject into the component's overlay container
      const overlayContainer = document.querySelector('.overlay-container');
      if (overlayContainer) {
        overlayContainer.appendChild(this.overlayScriptElement);
        console.log('[MediaPlayer] ✅ Overlay script injected');
      } else {
        // Fallback: inject into document head
        document.head.appendChild(this.overlayScriptElement);
        console.warn('[MediaPlayer] Overlay container not found, injected script into head');
      }
    }, 100); // Small delay to ensure HTML is rendered
  }

  onMediaLoaded() {
    const element = this.mediaElementRef?.nativeElement;
    if (!element) return;

    const duration = element.duration;
    let width: number | undefined;
    let height: number | undefined;

    if (this.mediaType === 'video' && element instanceof HTMLVideoElement) {
      width = element.videoWidth;
      height = element.videoHeight;
    }

    this.mediaLoaded.emit({ duration, width, height });
  }

  onTimeUpdate() {
    const element = this.mediaElementRef?.nativeElement;
    if (!element) return;

    this.timeUpdate.emit(element.currentTime);
  }

  onPlay() {
    this.mediaIsPlaying = true;
    this.playEvent.emit();
    // Hide "Initializing..." and title text when media starts playing
    this.hideOverlayText();
  }

  onPause() {
    this.mediaIsPlaying = false;
    this.pauseEvent.emit();
  }

  private hideOverlayText() {
    // Hide elements containing "Initializing" or interaction title text
    if (this.hasOverlay) {
      setTimeout(() => {
        const overlayContainer = document.querySelector('.overlay-container');
        if (overlayContainer) {
          const allElements = overlayContainer.querySelectorAll('*');
          allElements.forEach((el: Element) => {
            const text = el.textContent || '';
            // Hide if contains "Initializing" or looks like a title/header
            if (text.includes('Initializing') || 
                (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName) && text.length < 100)) {
              (el as HTMLElement).style.display = 'none';
            }
          });
        }
      }, 100);
    }
  }

  onEnded() {
    this.endedEvent.emit();
  }

  onError(event: Event) {
    const element = event.target as HTMLVideoElement | HTMLAudioElement;
    const error = element?.error;
    
    let errorMessage = 'Unknown media error';
    if (error) {
      // Map error codes to more descriptive messages
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'MEDIA_ELEMENT_ERROR: Playback aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'MEDIA_ELEMENT_ERROR: Network error - unable to load media file';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'MEDIA_ELEMENT_ERROR: Format error - unable to decode media file. The file may be corrupted or in an unsupported format.';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'MEDIA_ELEMENT_ERROR: Format not supported - the media format is not supported by your browser';
          break;
        default:
          errorMessage = `MEDIA_ELEMENT_ERROR: ${error.message || 'Format error'}`;
      }
    }
    
    console.error('[MediaPlayer] Media error details:', {
      code: error?.code,
      message: error?.message,
      mediaUrl: this.mediaUrl,
      mediaType: this.mediaType
    });
    
    this.errorEvent.emit(errorMessage);
  }

  // Public API methods for SDK control
  play(): void {
    const element = this.mediaElementRef?.nativeElement;
    if (element) {
      element.play().catch(err => {
        console.error('[MediaPlayer] Play error:', err);
      });
    }
  }

  pause(): void {
    const element = this.mediaElementRef?.nativeElement;
    if (element) {
      element.pause();
    }
  }

  seekTo(time: number): void {
    const element = this.mediaElementRef?.nativeElement;
    if (element) {
      element.currentTime = Math.max(0, Math.min(time, element.duration || 0));
    }
  }

  setVolume(volume: number): void {
    const element = this.mediaElementRef?.nativeElement;
    if (element) {
      element.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getCurrentTime(): number {
    const element = this.mediaElementRef?.nativeElement;
    return element?.currentTime || 0;
  }

  getDuration(): number {
    const element = this.mediaElementRef?.nativeElement;
    return element?.duration || 0;
  }

  isPlaying(): boolean {
    const element = this.mediaElementRef?.nativeElement;
    return element ? !element.paused && !element.ended : false;
  }

  getSafeOverlayHtml(): SafeHtml {
    return this.domSanitizer.bypassSecurityTrustHtml(this.overlayHtml);
  }
}


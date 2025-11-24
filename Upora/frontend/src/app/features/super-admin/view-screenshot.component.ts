import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { ScreenshotStorageService } from '../../core/services/screenshot-storage.service';

@Component({
  selector: 'app-view-screenshot',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content [style.--padding-top]="'80px'">
      <div class="screenshot-view-page">
        <div class="page-header">
          <button class="back-btn" (click)="goBack()">
            ← Back to Tests
          </button>
          <h1>📸 Last Screenshot</h1>
          <p class="subtitle">Screenshot sent to AI Teacher (for testing/debugging)</p>
        </div>

        <div class="screenshot-container" *ngIf="screenshot">
          <div class="screenshot-info">
            <p class="timestamp">Captured: {{ timestamp | date:'medium' }}</p>
            <p class="size-info">Size: {{ screenshotSize }} characters</p>
          </div>
          <div class="image-wrapper">
            <img [src]="screenshot" alt="Last screenshot sent to AI Teacher" class="screenshot-image" />
          </div>
          <div class="actions">
            <button class="btn-secondary" (click)="downloadScreenshot()">
              💾 Download Screenshot
            </button>
            <button class="btn-secondary" (click)="clearScreenshot()">
              🗑️ Clear Screenshot
            </button>
          </div>
        </div>

        <div class="no-screenshot" *ngIf="!screenshot">
          <div class="no-screenshot-content">
            <h2>⚠️ No Screenshot Available</h2>
            <p>No screenshot has been captured yet.</p>
            <p>To capture a screenshot, ask the AI Teacher about your screen in a lesson view.</p>
            <button class="btn-primary" (click)="goBack()">
              ← Back to Tests
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
    }

    .screenshot-view-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      padding: 2rem;
      padding-top: 1rem;
      color: #ffffff;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .back-btn {
      background: rgba(255, 255, 255, 0.1);
      color: #00d4ff;
      border: 1px solid #00d4ff;
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      cursor: pointer;
      margin-bottom: 1rem;
      transition: all 0.2s ease;
    }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0.5rem 0;
    }

    .subtitle {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }

    .screenshot-container {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .screenshot-info {
      display: flex;
      gap: 2rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .screenshot-info p {
      margin: 0;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.875rem;
    }

    .image-wrapper {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }

    .screenshot-image {
      max-width: 100%;
      max-height: 70vh;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-primary {
      background: #00d4ff;
      color: #000000;
    }

    .btn-primary:hover {
      background: #00b8e6;
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }

    .no-screenshot {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .no-screenshot-content {
      text-align: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 3rem;
      max-width: 500px;
    }

    .no-screenshot-content h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: rgba(255, 255, 255, 0.8);
    }

    .no-screenshot-content p {
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 1rem;
      line-height: 1.6;
    }

    @media (max-width: 768px) {
      .screenshot-view-page {
        padding: 1rem;
      }

      .screenshot-info {
        flex-direction: column;
        gap: 0.5rem;
      }

      .actions {
        flex-direction: column;
      }
    }
  `]
})
export class ViewScreenshotComponent implements OnInit {
  screenshot: string | null = null;
  timestamp: Date | null = null;
  screenshotSize: number = 0;

  constructor(
    private screenshotStorage: ScreenshotStorageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadScreenshot();
  }

  loadScreenshot() {
    this.screenshot = this.screenshotStorage.getLastScreenshot();
    this.timestamp = this.screenshotStorage.getScreenshotTimestamp();
    this.screenshotSize = this.screenshot ? this.screenshot.length : 0;
  }

  goBack() {
    this.router.navigate(['/super-admin/tests']);
  }

  downloadScreenshot() {
    if (!this.screenshot) return;

    // Create a download link
    const link = document.createElement('a');
    link.href = this.screenshot;
    link.download = `screenshot-${this.timestamp?.toISOString().replace(/[:.]/g, '-') || 'unknown'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  clearScreenshot() {
    this.screenshotStorage.clearScreenshot();
    this.screenshot = null;
    this.timestamp = null;
    this.screenshotSize = 0;
  }
}



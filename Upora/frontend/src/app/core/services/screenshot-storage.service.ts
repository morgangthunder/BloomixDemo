import { Injectable } from '@angular/core';

/**
 * Service to store the last screenshot sent to the AI Teacher
 * Only stores 1 screenshot at a time (the most recent one)
 * Used for testing/debugging purposes
 */
@Injectable({
  providedIn: 'root'
})
export class ScreenshotStorageService {
  private lastScreenshot: string | null = null;
  private screenshotTimestamp: Date | null = null;

  /**
   * Store a screenshot (replaces any previous screenshot)
   */
  storeScreenshot(screenshot: string): void {
    this.lastScreenshot = screenshot;
    this.screenshotTimestamp = new Date();
    console.log('[ScreenshotStorage] 📸 Screenshot stored at', this.screenshotTimestamp.toISOString());
  }

  /**
   * Get the last stored screenshot
   */
  getLastScreenshot(): string | null {
    return this.lastScreenshot;
  }

  /**
   * Get the timestamp of the last screenshot
   */
  getScreenshotTimestamp(): Date | null {
    return this.screenshotTimestamp;
  }

  /**
   * Clear the stored screenshot
   */
  clearScreenshot(): void {
    this.lastScreenshot = null;
    this.screenshotTimestamp = null;
    console.log('[ScreenshotStorage] 🧹 Screenshot cleared');
  }

  /**
   * Check if a screenshot is available
   */
  hasScreenshot(): boolean {
    return this.lastScreenshot !== null;
  }
}

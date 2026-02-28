import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SnackMessage {
  id: string;
  content: string;
  duration?: number; // milliseconds, undefined = until manually closed or replaced
  actions?: string[]; // action button labels (e.g. ['Skip', 'Retry'])
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class SnackMessageService {
  private currentMessage$ = new BehaviorSubject<SnackMessage | null>(null);
  
  /**
   * Observable for current snack message
   */
  get currentMessage(): Observable<SnackMessage | null> {
    return this.currentMessage$.asObservable();
  }

  /**
   * Show a snack message
   * @param content Message text
   * @param duration Duration in milliseconds (undefined = until manually closed or replaced)
   */
  private actionSubject$ = new BehaviorSubject<{ snackId: string; action: string } | null>(null);

  get actionClicked(): Observable<{ snackId: string; action: string } | null> {
    return this.actionSubject$.asObservable();
  }

  onAction(action: string): void {
    const current = this.currentMessage$.value;
    if (current) {
      this.actionSubject$.next({ snackId: current.id, action });
    }
  }

  show(content: string, duration?: number, actions?: string[]): string {
    console.log('[SnackMessageService] 📤 show() called with:', content.substring(0, 50) + '...', 'duration:', duration);
    const message: SnackMessage = {
      id: `snack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      duration,
      actions,
      timestamp: new Date(),
    };

    console.log('[SnackMessageService] 📤 Emitting message:', message.id);
    // Replace any existing message
    this.currentMessage$.next(message);
    console.log('[SnackMessageService] ✅ Message emitted, current subscribers:', this.currentMessage$.observers.length);

    // Auto-hide after duration if specified
    if (duration && duration > 0) {
      setTimeout(() => {
        // Only hide if this is still the current message
        const current = this.currentMessage$.value;
        if (current && current.id === message.id) {
          console.log('[SnackMessageService] ⏰ Auto-hiding message after duration');
          this.hide();
        }
      }, duration);
    }

    return message.id;
  }

  /**
   * Hide current snack message
   */
  hide(): void {
    console.log('[SnackMessageService] hide() called');
    console.trace('[SnackMessageService] hide() stack trace');
    this.currentMessage$.next(null);
  }

  /**
   * Get current message (synchronous)
   */
  getCurrentMessage(): SnackMessage | null {
    return this.currentMessage$.value;
  }
}


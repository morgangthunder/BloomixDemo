import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ProcessedContentItem {
  id: string;
  type: string;
  title: string;
  description: string;
  thumbnail?: string;
  duration?: number;
  channel?: string;
  videoId?: string;
  transcript?: string;
  startTime?: number;
  endTime?: number;
  autoplay?: boolean;
  showControls?: boolean;
  validationScore?: number;
  status: 'ready' | 'processing' | 'error';
  createdAt: string;
  lessonId: string;
  metadata?: any;
  contentSourceId?: string;
  contentSource?: {
    id: string;
    title: string;
    type: string;
    sourceUrl?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProcessedContentService {
  private processedContentSubject = new BehaviorSubject<ProcessedContentItem[]>([]);
  public processedContent$ = this.processedContentSubject.asObservable();

  constructor() {
    // Load stored content on service initialization
    this.loadStoredContent();
  }

  /**
   * Add processed content item
   */
  addProcessedContent(content: ProcessedContentItem): void {
    const currentContent = this.processedContentSubject.value;
    
    // Check if this content already exists (by id or by videoId for YouTube videos)
    const isDuplicate = currentContent.some(item => {
      if (item.id === content.id) return true;
      if (content.videoId && item.videoId === content.videoId && item.lessonId === content.lessonId) return true;
      return false;
    });
    
    if (isDuplicate) {
      console.warn('[ProcessedContentService] ⚠️ Duplicate content detected, skipping:', content.id || content.videoId);
      return;
    }
    
    const updatedContent = [...currentContent, content];
    this.processedContentSubject.next(updatedContent);
    this.saveToStorage(updatedContent);
  }

  /**
   * Get processed content for a specific lesson
   */
  getProcessedContentForLesson(lessonId: string): Observable<ProcessedContentItem[]> {
    return new Observable(observer => {
      this.processedContent$.subscribe(allContent => {
        const lessonContent = allContent.filter(item => item.lessonId === lessonId);
        observer.next(lessonContent);
      });
    });
  }

  /**
   * Get processed content by ID
   */
  getProcessedContentById(id: string): ProcessedContentItem | null {
    const allContent = this.processedContentSubject.value;
    return allContent.find(item => item.id === id) || null;
  }

  /**
   * Get all processed content
   */
  getAllProcessedContent(): ProcessedContentItem[] {
    return this.processedContentSubject.value;
  }

  /**
   * Update processed content status
   */
  updateProcessedContentStatus(id: string, status: ProcessedContentItem['status']): void {
    const currentContent = this.processedContentSubject.value;
    const updatedContent = currentContent.map(item => 
      item.id === id ? { ...item, status } : item
    );
    this.processedContentSubject.next(updatedContent);
    this.saveToStorage(updatedContent);
  }

  /**
   * Remove processed content
   */
  removeProcessedContent(id: string): void {
    const currentContent = this.processedContentSubject.value;
    const updatedContent = currentContent.filter(item => item.id !== id);
    this.processedContentSubject.next(updatedContent);
    this.saveToStorage(updatedContent);
  }

  /**
   * Clear all processed content for a lesson
   */
  clearProcessedContentForLesson(lessonId: string): void {
    const currentContent = this.processedContentSubject.value;
    const updatedContent = currentContent.filter(item => item.lessonId !== lessonId);
    this.processedContentSubject.next(updatedContent);
    this.saveToStorage(updatedContent);
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(content: ProcessedContentItem[]): void {
    try {
      localStorage.setItem('processed_content', JSON.stringify(content));
    } catch (error) {
      console.warn('Failed to save processed content to localStorage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadStoredContent(): void {
    try {
      const stored = localStorage.getItem('processed_content');
      if (stored) {
        const content = JSON.parse(stored);
        this.processedContentSubject.next(content);
      }
    } catch (error) {
      console.warn('Failed to load processed content from localStorage:', error);
    }
  }
}


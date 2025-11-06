import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { LessonDataSchema, ProcessedContentData, ValidationResult } from '../models/lesson-data.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LessonDataService {
  private apiUrl = `${environment.apiUrl}/lesson-editor`;
  
  // Current lesson data state
  private currentLessonDataSubject = new BehaviorSubject<LessonDataSchema | null>(null);
  public currentLessonData$ = this.currentLessonDataSubject.asObservable();

  // Processed content state
  private processedContentSubject = new BehaviorSubject<ProcessedContentData[]>([]);
  public processedContent$ = this.processedContentSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Load lesson data from API
   */
  loadLessonData(lessonId: string): Observable<LessonDataSchema> {
    return this.http.get<LessonDataSchema>(`${this.apiUrl}/lessons/${lessonId}/data`);
  }

  /**
   * Update lesson data
   */
  updateLessonData(lessonId: string, lessonData: LessonDataSchema): Observable<any> {
    return this.http.patch(`${this.apiUrl}/lessons/${lessonId}/data`, lessonData);
  }

  /**
   * Add processed content to lesson
   */
  addProcessedContent(lessonId: string, processedContent: ProcessedContentData): Observable<any> {
    return this.http.post(`${this.apiUrl}/lessons/${lessonId}/processed-content`, processedContent);
  }

  /**
   * Remove processed content from lesson
   */
  removeProcessedContent(lessonId: string, contentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/lessons/${lessonId}/processed-content/${contentId}`);
  }

  /**
   * Validate content for interaction type
   */
  validateContentForInteraction(
    lessonId: string, 
    contentId: string, 
    interactionType: string
  ): Observable<ValidationResult> {
    return this.http.get<ValidationResult>(
      `${this.apiUrl}/lessons/${lessonId}/validate-content/${contentId}?interactionType=${interactionType}`
    );
  }

  /**
   * Set current lesson data
   */
  setCurrentLessonData(lessonData: LessonDataSchema): void {
    this.currentLessonDataSubject.next(lessonData);
    this.updateProcessedContentList(lessonData);
  }

  /**
   * Get current lesson data
   */
  getCurrentLessonData(): LessonDataSchema | null {
    return this.currentLessonDataSubject.value;
  }

  /**
   * Update processed content list
   */
  private updateProcessedContentList(lessonData: LessonDataSchema): void {
    const processedContent = Object.values(lessonData.processedContent);
    this.processedContentSubject.next(processedContent);
  }

  /**
   * Add processed content to current lesson
   */
  addProcessedContentToCurrent(processedContent: ProcessedContentData): void {
    const currentData = this.getCurrentLessonData();
    if (currentData) {
      const updatedData = {
        ...currentData,
        processedContent: {
          ...currentData.processedContent,
          [processedContent.id]: processedContent
        }
      };
      this.setCurrentLessonData(updatedData);
    }
  }

  /**
   * Remove processed content from current lesson
   */
  removeProcessedContentFromCurrent(contentId: string): void {
    const currentData = this.getCurrentLessonData();
    if (currentData) {
      const { [contentId]: removed, ...remainingContent } = currentData.processedContent;
      const updatedData = {
        ...currentData,
        processedContent: remainingContent
      };
      this.setCurrentLessonData(updatedData);
    }
  }

  /**
   * Get processed content by type
   */
  getProcessedContentByType(type: ProcessedContentData['type']): ProcessedContentData[] {
    const currentData = this.getCurrentLessonData();
    if (!currentData) return [];
    
    return Object.values(currentData.processedContent).filter(
      content => content.type === type
    );
  }

  /**
   * Get processed content by ID
   */
  getProcessedContentById(contentId: string): ProcessedContentData | null {
    const currentData = this.getCurrentLessonData();
    if (!currentData) return null;
    
    return currentData.processedContent[contentId] || null;
  }

  /**
   * Create new processed content
   */
  createProcessedContent(
    name: string,
    type: ProcessedContentData['type'],
    data: any,
    sourceContentId?: string,
    workflowName?: string
  ): ProcessedContentData {
    const now = new Date().toISOString();
    const id = this.generateId();
    
    return {
      id,
      name,
      type,
      sourceContentId,
      workflowName,
      createdBy: environment.defaultUserId,
      createdAt: now,
      data,
      metadata: {
        quality: 8,
        confidence: 0.9,
        tags: [],
        validationStatus: 'pending'
      }
    };
  }

  /**
   * Update lesson config
   */
  updateLessonConfig(updates: Partial<LessonDataSchema['config']>): void {
    const currentData = this.getCurrentLessonData();
    if (currentData) {
      const updatedData = {
        ...currentData,
        config: {
          ...currentData.config,
          ...updates
        },
        metadata: {
          ...currentData.metadata,
          updated: new Date().toISOString()
        }
      };
      this.setCurrentLessonData(updatedData);
    }
  }

  /**
   * Update AI context
   */
  updateAIContext(updates: Partial<LessonDataSchema['aiContext']>): void {
    const currentData = this.getCurrentLessonData();
    if (currentData) {
      const updatedData = {
        ...currentData,
        aiContext: {
          ...currentData.aiContext,
          ...updates
        },
        metadata: {
          ...currentData.metadata,
          updated: new Date().toISOString()
        }
      };
      this.setCurrentLessonData(updatedData);
    }
  }

  /**
   * Add stage to lesson
   */
  addStage(stage: Omit<LessonDataSchema['structure']['stages'][0], 'id'>): void {
    const currentData = this.getCurrentLessonData();
    if (currentData) {
      const newStage = {
        ...stage,
        id: this.generateId()
      };
      
      const updatedData = {
        ...currentData,
        structure: {
          ...currentData.structure,
          stages: [...currentData.structure.stages, newStage]
        },
        metadata: {
          ...currentData.metadata,
          updated: new Date().toISOString()
        }
      };
      this.setCurrentLessonData(updatedData);
    }
  }

  /**
   * Add substage to stage
   */
  addSubStage(stageId: string, subStage: Omit<LessonDataSchema['structure']['stages'][0]['subStages'][0], 'id'>): void {
    const currentData = this.getCurrentLessonData();
    if (currentData) {
      const newSubStage = {
        ...subStage,
        id: this.generateId()
      };
      
      const updatedData = {
        ...currentData,
        structure: {
          ...currentData.structure,
          stages: currentData.structure.stages.map(stage =>
            stage.id === stageId
              ? { ...stage, subStages: [...stage.subStages, newSubStage] }
              : stage
          )
        },
        metadata: {
          ...currentData.metadata,
          updated: new Date().toISOString()
        }
      };
      this.setCurrentLessonData(updatedData);
    }
  }

  /**
   * Calculate total lesson duration
   */
  calculateTotalDuration(): number {
    const currentData = this.getCurrentLessonData();
    if (!currentData) return 0;
    
    return currentData.structure.stages.reduce(
      (total, stage) => total + stage.duration,
      0
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

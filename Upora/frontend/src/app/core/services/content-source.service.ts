import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ContentSource, SearchResult, LessonDataLink } from '../models/content-source.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ContentSourceService {
  private contentSourcesSubject = new BehaviorSubject<ContentSource[]>([]);
  private pendingContentSubject = new BehaviorSubject<ContentSource[]>([]);
  
  contentSources$ = this.contentSourcesSubject.asObservable();
  pendingContent$ = this.pendingContentSubject.asObservable();

  constructor(private apiService: ApiService) {}

  /**
   * Load all content sources
   */
  async loadContentSources(status?: string): Promise<void> {
    try {
      const params: any = {};
      if (status) {
        params.status = status;
      }

      // ApiService.get() only accepts params, not an options object
      const sources = await this.apiService.get<ContentSource[]>('/content-sources', params).toPromise();

      if (status === 'pending') {
        this.pendingContentSubject.next(sources || []);
      } else {
        this.contentSourcesSubject.next(sources || []);
      }
      
      console.log(`[ContentSourceService] Loaded ${sources?.length || 0} content sources (status: ${status || 'all'})`);
    } catch (error) {
      console.error('[ContentSourceService] Failed to load content sources:', error);
      throw error;
    }
  }

  /**
   * Get single content source
   */
  async getContentSource(id: string): Promise<ContentSource> {
    return await this.apiService.get<ContentSource>(`/content-sources/${id}`).toPromise() as ContentSource;
  }

  /**
   * Create new content source
   */
  async createContentSource(data: Partial<ContentSource>): Promise<ContentSource> {
    const created = await this.apiService.post<ContentSource>('/content-sources', data).toPromise();

    console.log(`[ContentSourceService] Created content source: ${created?.id}`);
    await this.loadContentSources(); // Reload list
    return created!;
  }

  /**
   * Update content source
   */
  async updateContentSource(id: string, data: Partial<ContentSource>): Promise<ContentSource> {
    const updated = await this.apiService.patch<ContentSource>(`/content-sources/${id}`, data).toPromise();

    await this.loadContentSources();
    return updated!;
  }

  /**
   * Submit content for approval
   */
  async submitForApproval(id: string): Promise<ContentSource> {
    const submitted = await this.apiService.post<ContentSource>(`/content-sources/${id}/submit`, {}).toPromise();

    console.log(`[ContentSourceService] Submitted for approval: ${id}`);
    await this.loadContentSources();
    return submitted!;
  }

  /**
   * Approve content source (admin only)
   */
  async approveContent(id: string): Promise<ContentSource> {
    const approved = await this.apiService.post<ContentSource>(`/content-sources/${id}/approve`, {}).toPromise();

    console.log(`[ContentSourceService] ✅ Approved and indexed: ${id}`);
    console.log(`  Weaviate ID: ${approved?.weaviateId}`);
    
    await this.loadContentSources('pending'); // Reload pending list
    return approved!;
  }

  /**
   * Reject content source (admin only)
   */
  async rejectContent(id: string, reason: string): Promise<ContentSource> {
    const rejected = await this.apiService.post<ContentSource>(`/content-sources/${id}/reject`, { reason }).toPromise();

    console.log(`[ContentSourceService] Rejected: ${id} - ${reason}`);
    await this.loadContentSources('pending');
    return rejected!;
  }

  /**
   * Delete content source
   */
  async deleteContentSource(id: string): Promise<void> {
    await this.apiService.delete(`/content-sources/${id}`).toPromise();

    console.log(`[ContentSourceService] Deleted: ${id}`);
    await this.loadContentSources();
  }

  /**
   * Semantic search (BM25)
   */
  async searchContent(query: string, limit: number = 10): Promise<SearchResult[]> {
    const results = await this.apiService.post<SearchResult[]>('/content-sources/search', {
      query,
      tenantId: environment.tenantId,
      limit
    }).toPromise();

    console.log(`[ContentSourceService] Search for "${query}" returned ${results?.length || 0} results`);
    return results || [];
  }

  /**
   * Link content to lesson
   */
  async linkToLesson(lessonId: string, contentSourceId: string, relevanceScore?: number): Promise<LessonDataLink> {
    const link = await this.apiService.post<LessonDataLink>('/content-sources/link-to-lesson', {
      lessonId,
      contentSourceId,
      relevanceScore
    }).toPromise();

    console.log(`[ContentSourceService] Linked content ${contentSourceId} to lesson ${lessonId}`);
    return link!;
  }

  /**
   * Get content linked to a lesson
   */
  async getLinkedContent(lessonId: string): Promise<ContentSource[]> {
    const linked = await this.apiService.get<ContentSource[]>(`/content-sources/lesson/${lessonId}`).toPromise();
    console.log(`[ContentSourceService] Found ${linked?.length || 0} linked content sources for lesson ${lessonId}`);
    return linked || [];
  }

  /**
   * Unlink content from lesson
   */
  async unlinkFromLesson(lessonId: string, contentSourceId: string): Promise<void> {
    await this.apiService.delete<void>(`/content-sources/lesson/${lessonId}/content/${contentSourceId}`).toPromise();
    console.log(`[ContentSourceService] Unlinked content ${contentSourceId} from lesson ${lessonId}`);
  }
}


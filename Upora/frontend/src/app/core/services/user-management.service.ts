import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface UserSearchResult {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  name: string;
  createdAt: string;
  engagement?: {
    viewCount: number;
    completionCount: number;
    interactionCount: number;
    firstViewedAt: string | null;
    lastActivityAt: string | null;
    hasCompleted: boolean;
    averageScore?: number | null;
    totalScoredInteractions?: number;
    interactions?: Array<{
      stageId: string;
      substageId: string;
      interactionTypeId?: string;
      score?: number | null;
      completed?: boolean;
      attempts?: number;
    }>;
  };
}

export interface UserDashboard {
  account: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
    firstName?: string;
    subscriptionTier: string;
    authProvider: string;
    createdAt: string;
    updatedAt: string;
  };
  personalisation?: {
    fullName?: string;
    ageRange?: string;
    gender?: string;
    favouriteTvMovies?: string[];
    hobbiesInterests?: string[];
    learningAreas?: string[];
    onboardingCompletedAt?: string;
    skippedOnboarding: boolean;
  } | null;
  personalSettings?: {
    displayName?: string;
    preferences?: Record<string, any>;
    publicAvatarUrl?: string;
    shareName: boolean;
    sharePreferences: boolean;
  } | null;
  lessonEngagement: Array<{
    lessonId: string;
    title: string;
    viewCount: number;
    lastViewed: string;
  }>;
  lessonProgress: Array<{
    id: string;
    lessonId: string;
    stageId: string;
    substageId: string;
    interactionTypeId: string;
    completed: boolean;
    score?: number;
    attempts: number;
    startTimestamp: string;
    completeTimestamp?: string;
  }>;
  usageMetrics: {
    lessonViews: number;
    lastActivity: string | null;
  };
  llmUsage: {
    tokenLimit: number;
    tokensUsedThisPeriod: number;
    percentRemaining: number;
    renewalAt?: string | null;
    assistantBreakdown: Array<{
      assistantId: string;
      tokensUsed: number;
      cost: number;
      callCount: number;
    }>;
    recentQueries: Array<{
      id: string;
      assistantId?: string;
      tokensUsed: number;
      createdAt: string;
    }>;
  };
  lessonEngagementTranscriptions?: Array<{
    id: string;
    lessonId: string;
    createdAt: string;
    transcriptLength: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  constructor(
    private api: ApiService,
    private auth: AuthService,
  ) {}

  searchUsers(q: string, by: 'email' | 'id' | 'name' = 'email'): Observable<UserSearchResult[]> {
    return this.api.get<UserSearchResult[]>('/super-admin/users/search', { q, by });
  }

  getUserDashboard(userId: string): Observable<UserDashboard> {
    return this.api.get<UserDashboard>(`/super-admin/users/${userId}/dashboard`);
  }

  /** Creator engagement view: dashboard for one engager (no transcriptions, no password reset). */
  getLessonEngagerDashboard(lessonId: string, userId: string): Observable<UserDashboard> {
    return this.api.get<UserDashboard>(`/lessons/${lessonId}/engagers/${userId}/dashboard`);
  }

  getTranscriptions(userId: string): Observable<any[]> {
    return this.api.get<any[]>(`/super-admin/users/${userId}/transcriptions`);
  }

  sendPasswordReset(userId: string): Observable<{ sent: boolean; message: string }> {
    return this.api.post<{ sent: boolean; message: string }>(
      `/super-admin/users/${userId}/send-password-reset`,
      {},
    );
  }

  getProfileDashboard(): Observable<UserDashboard> {
    return this.api.get<UserDashboard>('/profile/dashboard');
  }

  // Phase 6.5: Creator Engagement View
  getLessonEngagers(lessonId: string, searchQuery?: string): Observable<UserSearchResult[]> {
    const params: any = {};
    if (searchQuery) {
      params.q = searchQuery;
    }
    return this.api.get<UserSearchResult[]>(`/lessons/${lessonId}/engagers`, params).pipe(
      tap((engagers) => {
        console.log('[UserManagementService] 📥 Received engagers from API:', engagers.length);
        engagers.forEach((engager) => {
          const interactionCount = engager.engagement?.interactions?.length ?? 0;
          console.log(`[UserManagementService]   - ${engager.name} (${engager.email}):`, {
            interactionCount,
            interactions: engager.engagement?.interactions?.map((i: any) => ({
              id: i.id,
              interactionTypeId: i.interactionTypeId || i.interaction_type_id,
              stageId: i.stageId || i.stage_id,
              substageId: i.substageId || i.substage_id,
              score: i.score,
              completed: i.completed,
            })),
            averageScore: engager.engagement?.averageScore,
          });
        });
      })
    );
  }
}

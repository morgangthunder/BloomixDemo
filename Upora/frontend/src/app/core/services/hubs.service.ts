import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface HubSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  isPublic: boolean;
  logoUrl: string | null;
  bannerUrl: string | null;
  status: string;
  myRole: string | null;
  myStatus: string | null;
  createdAt: string;
}

export interface HubDetail extends HubSummary {
  memberCount: number;
  contentCount: number;
  themeConfig: Record<string, any> | null;
  tenantId: string;
  ownerId: string;
  createdBy: string;
  authProvider?: string;
  ssoEnabled?: boolean;
}

export interface HubMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string | null;
}

export interface HubContentResponse {
  lessons: HubContentItem[];
  courses: HubCourseItem[];
}

export interface HubContentItem {
  linkId: string;
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  category: string;
  difficulty: string;
  status: string;
  sortOrder: number;
}

export interface HubCourseItem {
  linkId: string;
  id: string;
  title: string;
  description: string;
  status: string;
  sortOrder: number;
  lessons: any[];
}

export interface InviteResult {
  invited: number;
  alreadyMember: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class HubsService {
  private myHubsSubject = new BehaviorSubject<HubSummary[]>([]);
  private activeHubSubject = new BehaviorSubject<HubSummary | null>(null);

  myHubs$ = this.myHubsSubject.asObservable();
  activeHub$ = this.activeHubSubject.asObservable();

  constructor(private api: ApiService) {}

  // ─── Hub CRUD ───

  getMyHubs(): Observable<HubSummary[]> {
    return this.api.get<HubSummary[]>('/my/hubs').pipe(
      tap(hubs => this.myHubsSubject.next(hubs)),
    );
  }

  refreshMyHubs(): void {
    this.getMyHubs().subscribe();
  }

  getHub(slug: string): Observable<HubDetail> {
    return this.api.get<HubDetail>(`/hubs/${slug}`);
  }

  createHub(data: {
    name: string;
    slug: string;
    description?: string;
    type: string;
    isPublic?: boolean;
    logoUrl?: string;
    bannerUrl?: string;
  }): Observable<any> {
    return this.api.post('/hubs', data);
  }

  updateHub(id: string, data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    logoUrl?: string;
    bannerUrl?: string;
    themeConfig?: Record<string, any>;
  }): Observable<any> {
    return this.api.patch(`/hubs/${id}`, data);
  }

  archiveHub(id: string): Observable<void> {
    return this.api.delete<void>(`/hubs/${id}`);
  }

  // ─── Members ───

  getMembers(hubId: string, search?: string): Observable<HubMember[]> {
    const params: any = {};
    if (search) params.q = search;
    return this.api.get<HubMember[]>(`/hubs/${hubId}/members`, params);
  }

  inviteMembers(hubId: string, emails: string[]): Observable<InviteResult> {
    return this.api.post<InviteResult>(`/hubs/${hubId}/members/invite`, { emails });
  }

  acceptInvite(hubId: string): Observable<void> {
    return this.api.post<void>(`/hubs/${hubId}/members/accept`, {});
  }

  changeMemberRole(hubId: string, userId: string, role: string): Observable<void> {
    return this.api.patch<void>(`/hubs/${hubId}/members/${userId}`, { role });
  }

  removeMember(hubId: string, userId: string): Observable<void> {
    return this.api.delete<void>(`/hubs/${hubId}/members/${userId}`);
  }

  // ─── Content ───

  getHubContent(hubId: string): Observable<HubContentResponse> {
    return this.api.get<HubContentResponse>(`/hubs/${hubId}/content`);
  }

  linkContent(hubId: string, lessonId?: string, courseId?: string): Observable<any> {
    return this.api.post(`/hubs/${hubId}/content`, { lessonId, courseId });
  }

  unlinkContent(hubId: string, linkId: string): Observable<void> {
    return this.api.delete<void>(`/hubs/${hubId}/content/${linkId}`);
  }

  getHubLessons(slug: string): Observable<any[]> {
    return this.api.get<any[]>(`/hubs/${slug}/lessons`);
  }

  getHubCourses(slug: string): Observable<any[]> {
    return this.api.get<any[]>(`/hubs/${slug}/courses`);
  }

  // ─── Publish to Hubs ───

  publishLessonToHubs(lessonId: string, hubIds: string[]): Observable<{ linked: number; errors: string[] }> {
    return this.api.post(`/lessons/${lessonId}/publish-to-hubs`, { hubIds });
  }

  publishCourseToHubs(courseId: string, hubIds: string[]): Observable<{ linked: number; errors: string[] }> {
    return this.api.post(`/courses/${courseId}/publish-to-hubs`, { hubIds });
  }

  // ─── SSO / Auth Config ───

  getSsoInfo(slug: string): Observable<{ provider: string; ssoEnabled: boolean; ssoLoginUrl: string | null; issuerUrl: string | null }> {
    return this.api.get(`/auth/hub/${slug}/sso-info`);
  }

  // ─── Active Hub (for scoping) ───

  setActiveHub(hub: HubSummary | null): void {
    this.activeHubSubject.next(hub);
  }

  getActiveHub(): HubSummary | null {
    return this.activeHubSubject.value;
  }
}

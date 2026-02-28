import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

// ─── Interfaces ───

export interface LessonGroup {
  id: string;
  lessonId: string | null;
  courseId: string | null;
  parentCourseGroupId: string | null;
  name: string;
  description: string | null;
  isDefault: boolean;
  isCourseGroup?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  assignmentCount?: number;
  lessonTitle?: string | null;
  courseTitle?: string | null;
  membershipStatus?: string; // 'joined' | 'invited'
}

export interface GroupMember {
  id: string;
  email: string;
  name: string;
  role: string;
  status?: string;
  joinedAt: string | null;
  invitedAt: string | null;
}

export interface GroupDetail extends LessonGroup {
  isCourseGroup: boolean;
  lessonTitle: string | null;
  courseTitle: string | null;
}

export interface InviteResult {
  invited: number;
  alreadyMember: number;
  errors: string[];
}

export interface LessonVisibility {
  lessonId: string;
  title: string;
  status?: string;
  isVisible: boolean;
}

export type AssignmentType = 'offline' | 'file' | 'interaction';
export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded' | 'late' | 'resubmit_requested';

export interface Assignment {
  id: string;
  lessonId: string;
  groupId: string | null;
  title: string;
  description: string | null;
  type: AssignmentType;
  allowedFileTypes: string | null;
  maxFileSizeBytes: number | null;
  maxScore: number;
  stageId: string | null;
  substageId: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: SubmissionStatus;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  studentComment: string | null;
  score: number | null;
  graderFeedback: string | null;
  gradedBy: string | null;
  gradedAt: string | null;
  submittedAt: string | null;
  isLate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MyAssignment {
  id: string;
  lessonId: string;
  lessonTitle: string;
  title: string;
  description: string | null;
  type: AssignmentType;
  maxScore: number;
  status: SubmissionStatus;
  score: number | null;
  graderFeedback: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  isLate: boolean;
  fileUrl: string | null;
  fileName: string | null;
  deadline: string | null;
  deadlineNote: string | null;
}

export interface UserLessonDeadline {
  id: string;
  userId: string;
  lessonId: string;
  lessonTitle?: string;
  deadlineAt: string;
  note: string | null;
  isPast?: boolean;
  user?: { id: string; email: string; username?: string };
}

export interface GroupProgress {
  id: string;
  email: string;
  name: string;
  role: string;
  views: number;
  completions: number;
  interactionCount: number;
  completedInteractions: number;
  averageScore: number | null;
  deadline: string | null;
  deadlineNote: string | null;
  isPastDeadline: boolean;
}

@Injectable({ providedIn: 'root' })
export class LessonGroupsService {
  constructor(private api: ApiService) {}

  // ─── Groups ───

  getGroups(lessonId: string): Observable<LessonGroup[]> {
    return this.api.get<LessonGroup[]>(`/lessons/${lessonId}/groups`);
  }

  createGroup(lessonId: string, name: string, description?: string): Observable<LessonGroup> {
    return this.api.post<LessonGroup>(`/lessons/${lessonId}/groups`, { name, description });
  }

  updateGroup(groupId: string, data: { name?: string; description?: string }): Observable<LessonGroup> {
    return this.api.patch<LessonGroup>(`/lesson-groups/${groupId}`, data);
  }

  deleteGroup(groupId: string): Observable<void> {
    return this.api.delete<void>(`/lesson-groups/${groupId}`);
  }

  // ─── Members ───

  getMembers(groupId: string, searchQuery?: string): Observable<GroupMember[]> {
    const params: any = {};
    if (searchQuery) params.q = searchQuery;
    return this.api.get<GroupMember[]>(`/lesson-groups/${groupId}/members`, params);
  }

  addMember(groupId: string, userId: string): Observable<any> {
    return this.api.post(`/lesson-groups/${groupId}/members`, { userId });
  }

  removeMember(groupId: string, userId: string): Observable<void> {
    return this.api.delete<void>(`/lesson-groups/${groupId}/members/${userId}`);
  }

  // ─── Assignments ───

  getAssignments(lessonId: string, groupId?: string): Observable<Assignment[]> {
    const params: any = {};
    if (groupId) params.groupId = groupId;
    return this.api.get<Assignment[]>(`/lessons/${lessonId}/assignments`, params);
  }

  createAssignment(lessonId: string, data: Partial<Assignment>): Observable<Assignment> {
    return this.api.post<Assignment>(`/lessons/${lessonId}/assignments`, data);
  }

  updateAssignment(id: string, data: Partial<Assignment>): Observable<Assignment> {
    return this.api.patch<Assignment>(`/assignments/${id}`, data);
  }

  deleteAssignment(id: string): Observable<void> {
    return this.api.delete<void>(`/assignments/${id}`);
  }

  // ─── Submissions ───

  getSubmissions(assignmentId: string): Observable<AssignmentSubmission[]> {
    return this.api.get<AssignmentSubmission[]>(`/assignments/${assignmentId}/submissions`);
  }

  submitAssignment(assignmentId: string, comment?: string, file?: File): Observable<AssignmentSubmission> {
    const formData = new FormData();
    if (comment) formData.append('comment', comment);
    if (file) formData.append('file', file, file.name);
    return this.api.post<AssignmentSubmission>(`/assignments/${assignmentId}/submit`, formData);
  }

  gradeSubmission(submissionId: string, score: number, feedback?: string): Observable<AssignmentSubmission> {
    return this.api.patch<AssignmentSubmission>(`/assignment-submissions/${submissionId}/grade`, { score, feedback });
  }

  requestResubmission(submissionId: string, feedback?: string): Observable<AssignmentSubmission> {
    return this.api.patch<AssignmentSubmission>(`/assignment-submissions/${submissionId}/resubmit-request`, { feedback });
  }

  // ─── Student "My" endpoints ───

  getMyAssignments(): Observable<MyAssignment[]> {
    return this.api.get<MyAssignment[]>('/my/assignments');
  }

  getMyDeadlines(): Observable<UserLessonDeadline[]> {
    return this.api.get<UserLessonDeadline[]>('/my/deadlines');
  }

  // ─── Deadlines ───

  getDeadlines(lessonId: string): Observable<UserLessonDeadline[]> {
    return this.api.get<UserLessonDeadline[]>(`/lessons/${lessonId}/deadlines`);
  }

  setDeadline(lessonId: string, targetUserId: string, deadlineAt: string, data?: { groupId?: string; note?: string }): Observable<UserLessonDeadline> {
    return this.api.post<UserLessonDeadline>(`/lessons/${lessonId}/deadlines`, { targetUserId, deadlineAt, ...data });
  }

  setBulkDeadline(lessonId: string, groupId: string, deadlineAt: string, note?: string): Observable<{ count: number }> {
    return this.api.post<{ count: number }>(`/lessons/${lessonId}/deadlines/bulk`, { groupId, deadlineAt, note });
  }

  updateDeadline(id: string, data: { deadlineAt?: string; note?: string }): Observable<UserLessonDeadline> {
    return this.api.patch<UserLessonDeadline>(`/deadlines/${id}`, data);
  }

  deleteDeadline(id: string): Observable<void> {
    return this.api.delete<void>(`/deadlines/${id}`);
  }

  // ─── Progress ───

  getGroupProgress(groupId: string): Observable<GroupProgress[]> {
    return this.api.get<GroupProgress[]>(`/lesson-groups/${groupId}/progress`);
  }

  // ─── Course Groups ───

  getCourseGroups(courseId: string): Observable<LessonGroup[]> {
    return this.api.get<LessonGroup[]>(`/courses/${courseId}/groups`);
  }

  createCourseGroup(courseId: string, name: string, description?: string): Observable<LessonGroup> {
    return this.api.post<LessonGroup>(`/courses/${courseId}/groups`, { name, description });
  }

  getCourseGroupLessonVisibility(groupId: string): Observable<LessonVisibility[]> {
    return this.api.get<LessonVisibility[]>(`/course-groups/${groupId}/lesson-visibility`);
  }

  updateCourseGroupLessonVisibility(groupId: string, updates: { lessonId: string; isVisible: boolean }[]): Observable<any> {
    return this.api.patch(`/course-groups/${groupId}/lesson-visibility`, { updates });
  }

  getCourseDeadlines(courseId: string): Observable<any[]> {
    return this.api.get<any[]>(`/courses/${courseId}/deadlines`);
  }

  // ─── Invite Members ───

  inviteMembers(groupId: string, emails: string[]): Observable<InviteResult> {
    return this.api.post<InviteResult>(`/lesson-groups/${groupId}/invite`, { emails });
  }

  acceptInvite(groupId: string): Observable<{ success: boolean }> {
    return this.api.post<{ success: boolean }>(`/lesson-groups/${groupId}/accept-invite`, {});
  }

  // ─── Student "My" endpoints (groups) ───

  getMyGroups(): Observable<LessonGroup[]> {
    return this.api.get<LessonGroup[]>('/my/groups');
  }

  getMyLessonGroups(lessonId: string): Observable<LessonGroup[]> {
    return this.api.get<LessonGroup[]>(`/lessons/${lessonId}/my-groups`);
  }

  getMyCourseGroups(courseId: string): Observable<LessonGroup[]> {
    return this.api.get<LessonGroup[]>(`/courses/${courseId}/my-groups`);
  }

  // ─── Group Detail ───

  getGroupDetail(groupId: string): Observable<GroupDetail> {
    return this.api.get<GroupDetail>(`/groups/${groupId}/detail`);
  }
}

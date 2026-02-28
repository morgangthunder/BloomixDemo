import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CourseData {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: string;
  viewCount: number;
  completionCount: number;
  ratingAverage: string;
  createdBy: string;
  lessons?: any[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CoursesService {
  constructor(private api: ApiService) {}

  getCourses(): Observable<CourseData[]> {
    return this.api.get<CourseData[]>('/courses');
  }

  /** Get all approved courses (for homepage discovery) */
  getApprovedCourses(): Observable<CourseData[]> {
    return this.api.get<CourseData[]>('/courses/approved');
  }

  getCourse(id: string): Observable<CourseData> {
    return this.api.get<CourseData>(`/courses/${id}`);
  }

  createCourse(data: { title: string; description?: string }): Observable<CourseData> {
    return this.api.post<CourseData>('/courses', data);
  }

  updateCourse(id: string, data: { title?: string; description?: string; status?: string }): Observable<CourseData> {
    return this.api.patch<CourseData>(`/courses/${id}`, data);
  }

  deleteCourse(id: string): Observable<void> {
    return this.api.delete<void>(`/courses/${id}`);
  }

  getCourseLessons(courseId: string): Observable<any[]> {
    return this.api.get<any[]>(`/courses/${courseId}/lessons`);
  }

  addLesson(courseId: string, lessonId: string, addMembersToGroups?: boolean): Observable<any> {
    return this.api.post(`/courses/${courseId}/lessons`, { lessonId, addMembersToGroups });
  }

  removeLesson(courseId: string, lessonId: string): Observable<void> {
    return this.api.delete<void>(`/courses/${courseId}/lessons/${lessonId}`);
  }

  /** Get lessons created by the current user (for adding to a course) */
  getAvailableLessons(): Observable<any[]> {
    return this.api.get<any[]>('/lessons', { createdBy: 'me' });
  }
}

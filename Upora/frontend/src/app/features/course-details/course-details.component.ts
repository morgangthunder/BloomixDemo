import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { LessonService } from '../../core/services/lesson.service';
import { Observable } from 'rxjs';
import { Course, HubLesson } from '../../core/models/lesson.model';

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content [scrollEvents]="true" (ionScroll)="onScroll($event)">
      <div class="bg-brand-black min-h-screen text-brand-light-gray font-sans">
        <div *ngIf="activeCourse$ | async as course" class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <!-- Header -->
          <div class="flex items-center justify-between mb-8">
            <div>
              <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">{{ course.title }}</h1>
              <span 
                [class.bg-green-600]="course.status === 'Published'"
                [class.bg-yellow-600]="course.status === 'Pending Approval'"
                [class.bg-gray-600]="course.status === 'Build In Progress'"
                class="text-xs px-3 py-1 rounded text-white">
                {{ course.status }}
              </span>
            </div>
            <button 
              (click)="goBack()"
              class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded transition">
              Back
            </button>
          </div>

          <!-- Statistics -->
          <div class="grid md:grid-cols-4 gap-4 mb-8">
            <div class="bg-brand-dark rounded-lg p-6 border border-gray-700 text-center">
              <div class="text-3xl font-bold text-white mb-2">
                {{ course.stats.views | number }}
              </div>
              <div class="text-gray-400">Total Views</div>
            </div>
            <div class="bg-brand-dark rounded-lg p-6 border border-gray-700 text-center">
              <div class="text-3xl font-bold text-yellow-500 mb-2">
                {{ course.stats.completionRate }}%
              </div>
              <div class="text-gray-400">Completion Rate</div>
            </div>
            <div class="bg-brand-dark rounded-lg p-6 border border-gray-700 text-center">
              <div class="text-3xl font-bold text-blue-500 mb-2">
                {{ course.stats.completions | number }}
              </div>
              <div class="text-gray-400">Total Completions</div>
            </div>
            <div class="bg-brand-dark rounded-lg p-6 border border-gray-700 text-center">
              <div class="text-3xl font-bold text-green-500 mb-2">
                \${{ course.earnings | number:'1.2-2' }}
              </div>
              <div class="text-gray-400">Total Earnings</div>
            </div>
          </div>

          <!-- Lessons in Course -->
          <div>
            <h2 class="text-2xl font-bold text-white mb-4">Lessons in this Course</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div *ngFor="let lesson of courseLessons"
                   class="bg-brand-dark border border-gray-700 rounded-lg p-4 hover:border-brand-red transition-colors">
                <h3 class="text-lg font-bold text-white mb-2">{{ lesson.title }}</h3>
                <p class="text-sm text-gray-400 mb-2">{{ lesson.stageCount }} stages</p>
                <span 
                  [class.bg-green-600]="lesson.status === 'Published'"
                  [class.bg-yellow-600]="lesson.status === 'Pending Approval'"
                  [class.bg-gray-600]="lesson.status === 'Build In Progress'"
                  class="text-xs px-2 py-1 rounded text-white">
                  {{ lesson.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `
})
export class CourseDetailsComponent implements OnInit {
  activeCourse$: Observable<Course | null>;
  courseLessons: HubLesson[] = [];

  constructor(
    private lessonService: LessonService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.activeCourse$ = this.lessonService.activeCourse$;
  }

  ngOnInit() {
    // Get lessons for this course
    this.activeCourse$.subscribe(course => {
      if (course) {
        this.lessonService.hubLessons$.subscribe(lessons => {
          this.courseLessons = lessons.filter(l => l.courseId === course.id);
        });
      }
    });
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.lessonService.updateScrollPosition(scrollTop);
  }

  goBack() {
    this.lessonService.exitCourseDetails();
    this.router.navigate(['/lesson-builder']);
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { GroupManagementComponent } from '../../shared/components/group-management/group-management.component';

/**
 * Standalone wrapper for GroupManagementComponent.
 * Accessed via /lesson-groups/:lessonId or /course-groups/:courseId
 */
@Component({
  selector: 'app-group-management-standalone',
  standalone: true,
  imports: [CommonModule, IonContent, GroupManagementComponent],
  template: `
    <ion-content>
    <div class="min-h-screen bg-brand-black text-white pt-20">
      <div class="container mx-auto px-4 py-6">
        <!-- Back button -->
        <button (click)="goBack()" class="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to {{ isCourseMode ? 'Course' : 'Lesson' }} Builder
        </button>

        <div class="flex items-center gap-4 mb-6">
          <h1 class="text-2xl font-bold">
            Manage {{ isCourseMode ? 'Course' : 'Lesson' }} Groups
          </h1>
          <button *ngIf="isCourseMode"
                  (click)="goToCourseOverview()"
                  class="text-xs bg-cyan-900/50 text-cyan-400 border border-cyan-800 px-3 py-1 rounded hover:bg-cyan-800/50 transition">
            View Course Page
          </button>
        </div>

        <app-group-management
          *ngIf="targetId"
          [lessonId]="isCourseMode ? '' : targetId"
          [courseId]="isCourseMode ? targetId : ''"
        ></app-group-management>
      </div>
    </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #000; }
    :host ::ng-deep ion-content { --background: #000; --color: #fff; }
  `]
})
export class GroupManagementStandaloneComponent implements OnInit {
  targetId = '';
  isCourseMode = false;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    const courseId = this.route.snapshot.paramMap.get('courseId');

    if (courseId) {
      this.isCourseMode = true;
      this.targetId = courseId;
    } else if (lessonId) {
      this.isCourseMode = false;
      this.targetId = lessonId;
    }
  }

  goToCourseOverview() {
    if (this.isCourseMode && this.targetId) {
      this.router.navigate(['/course-overview', this.targetId]);
    }
  }

  goBack() {
    this.router.navigate(['/lesson-builder']);
  }
}

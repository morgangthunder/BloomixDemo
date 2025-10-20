import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { LessonService } from '../../core/services/lesson.service';
import { Observable } from 'rxjs';
import { Lesson } from '../../core/models/lesson.model';

@Component({
  selector: 'app-lesson-overview',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content [scrollEvents]="true" (ionScroll)="onScroll($event)">
      <div class="min-h-screen bg-brand-black text-white">
        <div *ngIf="overviewLesson$ | async as lesson">
          <!-- Hero Image -->
          <div class="relative h-[45vh] md:h-[60vh] w-full">
            <div
              class="absolute top-0 left-0 w-full h-full bg-cover bg-center"
              [style.background-image]="'url(' + lesson.thumbnailUrl.replace('400/225', '1280/720') + ')'">
            </div>
            <!-- Gradient Overlay -->
            <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-brand-black via-brand-black/50 to-transparent"></div>
          </div>

          <!-- Back Button - fixed position below header -->
          <button 
            (click)="goBack()" 
            class="fixed top-24 left-6 z-50 flex items-center text-sm text-white bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-black/50 transition-colors">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back
          </button>

          <!-- Content -->
          <div class="container mx-auto px-4 sm:px-6 lg:px-8 pb-16 -mt-32 md:-mt-48 relative z-10">
            <div class="max-w-4xl mx-auto">
              <h1 class="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg">
                {{ lesson.title }}
              </h1>
              
              <!-- Meta Info -->
              <div class="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-brand-light-gray">
                <div class="flex items-center">
                  <span class="font-semibold text-yellow-400 mr-1">{{ rating }}</span>
                  <span>⭐ ({{ ratingCount }} ratings)</span>
                </div>
                <span>|</span>
                <span>{{ getDuration(lesson) }} minutes</span>
                <span>|</span>
                <span>By {{ instructor }}</span>
              </div>

              <!-- Description -->
              <p class="mt-6 text-lg text-brand-light-gray max-w-prose">
                {{ lesson.description }}
              </p>
              
              <!-- Action Buttons -->
              <div class="mt-8 flex flex-wrap items-center gap-4">
                <button 
                  (click)="startLesson()"
                  class="flex items-center justify-center bg-brand-red text-white font-bold py-3 px-8 text-lg rounded-md hover:bg-red-700 transition">
                  <svg class="h-7 w-7 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"></path>
                  </svg>
                  Start Lesson
                </button>
                <button 
                  (click)="toggleMyList(lesson)"
                  class="flex items-center justify-center bg-gray-500 bg-opacity-70 text-white font-bold py-3 px-8 text-lg rounded hover:bg-opacity-50 transition">
                  <svg *ngIf="!isInMyList(lesson.id)" class="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  <svg *ngIf="isInMyList(lesson.id)" class="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  {{ isInMyList(lesson.id) ? 'In My List' : 'Add to List' }}
                </button>
                <button 
                  (click)="goBack()"
                  class="flex items-center justify-center bg-gray-700 text-white font-bold py-3 px-8 text-lg rounded hover:bg-gray-600 transition">
                  Back
                </button>
              </div>

              <!-- What You'll Learn -->
              <div class="mt-12 p-6 bg-brand-dark rounded-lg border border-gray-800">
                <h2 class="text-2xl font-bold mb-4">What you'll learn</h2>
                <ul class="space-y-3">
                  <li class="flex items-start">
                    <svg class="w-6 h-6 text-green-500 mr-3 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Master key phrases and cultural nuances to navigate conversations with confidence.</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-6 h-6 text-green-500 mr-3 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Learn how to handle common situations and communicate effectively.</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-6 h-6 text-green-500 mr-3 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Improve your skills through interactive exercises and real-life dialogues.</span>
                  </li>
                </ul>
              </div>

              <!-- Lesson Stages (if available) -->
              <div *ngIf="lesson.stages && lesson.stages.length > 0" class="mt-8 p-6 bg-brand-dark rounded-lg border border-gray-800">
                <h3 class="text-xl font-bold text-white mb-4">Lesson Stages ({{ lesson.stages.length }})</h3>
                <div class="space-y-2">
                  <div *ngFor="let stage of lesson.stages" class="bg-gray-800 p-4 rounded hover:bg-gray-700 transition-colors">
                    <h4 class="font-semibold text-white">{{ stage.title }}</h4>
                    <p class="text-sm text-gray-400">{{ stage.type }} • {{ stage.subStages.length }} sub-stages</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `
})
export class LessonOverviewComponent implements OnInit {
  overviewLesson$: Observable<Lesson | null>;
  rating = 4.8;
  ratingCount = '12.5k';
  instructor = 'Dr. Evelyn Reed';

  constructor(
    private lessonService: LessonService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.overviewLesson$ = this.lessonService.overviewLesson$;
  }

  ngOnInit() {
    this.lessonService.setCurrentPage('lessonOverview');
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.lessonService.updateScrollPosition(scrollTop);
  }

  getDuration(lesson: Lesson): number {
    if (!lesson.stages || lesson.stages.length === 0) return 45;
    return lesson.stages.reduce((total, stage) => 
      total + stage.subStages.reduce((subTotal, subStage) => 
        subTotal + subStage.duration, 0), 0);
  }

  startLesson() {
    this.lessonService.startLessonFromOverview();
  }

  toggleMyList(lesson: Lesson) {
    this.lessonService.toggleMyList(lesson);
  }

  isInMyList(lessonId: number): boolean {
    return this.lessonService.isInMyList(lessonId);
  }

  goBack() {
    this.lessonService.exitOverview();
    this.router.navigate(['/home']);
  }
}
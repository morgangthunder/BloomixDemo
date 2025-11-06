import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { LessonService } from '../../core/services/lesson.service';
import { Category, Lesson } from '../../core/models/lesson.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content [scrollEvents]="true" (ionScroll)="onScroll($event)">
      <div class="bg-brand-black min-h-screen text-brand-light-gray font-sans page-with-header">
        <main class="overflow-x-hidden">
          <!-- Hero Section -->
          <div *ngIf="featuredLesson" class="relative h-[500px] md:h-[600px] lg:h-[700px]">
            <div class="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent z-10"></div>
            <img 
              [src]="featuredLesson.thumbnailUrl" 
              [alt]="featuredLesson.title"
              class="w-full h-full object-cover"
            />
            <div class="absolute bottom-0 left-0 p-6 md:p-12 lg:p-16 z-20 max-w-2xl">
              <h1 class="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                {{ featuredLesson.title }}
              </h1>
              <p class="text-lg md:text-xl text-gray-300 mb-6">
                {{ featuredLesson.description }}
              </p>
              <div class="flex space-x-4">
                <button 
                  (click)="viewLesson(featuredLesson)"
                  class="bg-white text-black font-bold py-3 px-8 rounded hover:bg-opacity-80 transition flex items-center space-x-2"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"></path>
                  </svg>
                  <span>View Lesson</span>
                </button>
                <button 
                  (click)="viewLessonInfo(featuredLesson)"
                  class="bg-gray-600/80 text-white font-bold py-3 px-4 rounded hover:bg-gray-600 transition flex items-center space-x-2"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"></path>
                  </svg>
                  <span>More Info</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Categories -->
          <div class="py-8 md:py-12 lg:py-16 space-y-12 md:space-y-16 lg:space-y-20">
            <div *ngFor="let category of categories" class="px-4 md:px-6 lg:px-8">
              <h2 class="text-xl md:text-2xl font-bold text-white mb-4">{{ category.name }}</h2>
              <div class="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                <div 
                  *ngFor="let lesson of category.lessons" 
                  class="flex-shrink-0 w-48 md:w-56 lg:w-64 cursor-pointer group"
                  (click)="viewLesson(lesson)"
                >
                  <div class="relative overflow-hidden rounded">
                    <img 
                      [src]="lesson.thumbnailUrl" 
                      [alt]="lesson.title"
                      class="w-full h-32 md:h-36 lg:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <!-- Play icon overlay on hover -->
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                      <svg class="w-12 h-12 md:w-16 md:h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"></path>
                      </svg>
                    </div>
                  </div>
                  <h3 class="text-sm md:text-base font-semibold text-white mt-2 line-clamp-2">
                    {{ lesson.title }}
                  </h3>
                  <p class="text-xs md:text-sm text-gray-400 line-clamp-2">
                    {{ lesson.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ion-content>
  `,
  styles: [`
    .page-with-header {
      padding-top: 64px;
    }
    @media (min-width: 768px) {
      .page-with-header {
        padding-top: 80px;
      }
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
  `]
})
export class HomeComponent implements OnInit {
  categories: Category[] = [];
  featuredLesson: Lesson | null = null;

  constructor(
    private lessonService: LessonService,
    private router: Router
  ) {}

  ngOnInit() {
    // Subscribe to categories from API
    this.lessonService.categories$.subscribe(categories => {
      console.log('🔥 [HomeComponent] Categories updated via subscription:', categories.length, categories);
      this.categories = categories;
      console.log('🔥 [HomeComponent] this.categories now has:', this.categories.length);
      
      // Update featured lesson whenever categories change
      this.featuredLesson = this.lessonService.getFeaturedLesson();
      console.log('🔥 [HomeComponent] Featured lesson:', this.featuredLesson);
    });
    
    // Also log what we have after subscription setup
    setTimeout(() => {
      console.log('🕐 [HomeComponent] After 1 second - categories length:', this.categories.length);
    }, 1000);
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.lessonService.updateScrollPosition(scrollTop);
  }

  viewLesson(lesson: Lesson) {
    this.lessonService.showOverview(lesson);
    this.router.navigate(['/lesson-overview', lesson.id]);
  }

  viewLessonInfo(lesson: Lesson) {
    this.lessonService.showOverview(lesson);
    this.router.navigate(['/lesson-overview', lesson.id]);
  }

  toggleMyList(lesson: Lesson) {
    this.lessonService.toggleMyList(lesson);
  }

  isInMyList(lessonId: string): boolean {
    return this.lessonService.isInMyList(lessonId);
  }
}
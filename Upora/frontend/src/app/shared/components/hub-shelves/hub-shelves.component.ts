import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

export interface ShelfConfig {
  id: string;
  type: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
  config?: any;
}

export interface ShelfData extends ShelfConfig {
  data: any[];
  loading?: boolean;
}

@Component({
  selector: 'app-hub-shelves',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="shelves-container">
      <ng-container *ngFor="let shelf of resolvedShelves">
        <!-- Featured Hero Shelf -->
        <div *ngIf="shelf.type === 'featured' && shelf.data?.length > 0" class="relative h-[350px] md:h-[420px] lg:h-[490px]">
          <div class="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent z-10"></div>
          <img
            [src]="shelf.data[0].thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200'"
            [alt]="shelf.data[0].title"
            class="w-full h-full object-cover"
          />
          <div class="absolute bottom-0 left-0 p-6 md:p-12 lg:p-16 z-20 max-w-2xl">
            <h1 class="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {{ shelf.data[0].title }}
            </h1>
            <p class="text-lg md:text-xl text-gray-300 mb-6">
              {{ shelf.data[0].description }}
            </p>
            <div class="flex space-x-4">
              <button
                (click)="onLessonClick(shelf.data[0])"
                class="bg-white text-black font-bold py-3 px-8 rounded hover:bg-opacity-80 transition flex items-center space-x-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"></path>
                </svg>
                <span>View Lesson</span>
              </button>
              <button
                (click)="onLessonClick(shelf.data[0])"
                class="bg-gray-600/80 text-white font-bold py-3 px-4 rounded hover:bg-gray-600 transition flex items-center space-x-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"></path>
                </svg>
                <span>More Info</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Courses Shelf -->
        <div *ngIf="shelf.type === 'courses' && shelf.data?.length > 0" class="shelf-row">
          <h2 class="text-xl md:text-2xl font-bold text-white mb-4">{{ shelf.label }}</h2>
          <div class="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            <div
              *ngFor="let course of shelf.data"
              class="flex-shrink-0 w-48 md:w-56 lg:w-64 cursor-pointer group"
              (click)="onCourseClick(course)">
              <div class="relative overflow-hidden rounded">
                <img
                  [src]="course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'"
                  [alt]="course.title"
                  class="w-full h-32 md:h-36 lg:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div class="absolute bottom-2 right-2 bg-cyan-600/90 text-white rounded-full w-7 h-7 flex items-center justify-center z-10 shadow-lg">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                </div>
                <div class="absolute top-2 left-2 bg-black/70 text-gray-300 rounded px-1.5 py-0.5 text-[10px] font-semibold z-10">
                  {{ course.lessonCount || 0 }} lessons
                </div>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <svg class="w-12 h-12 md:w-16 md:h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"></path>
                  </svg>
                </div>
              </div>
              <h3 class="text-sm md:text-base font-semibold text-white mt-2 line-clamp-2">{{ course.title }}</h3>
              <p *ngIf="course.description" class="text-xs md:text-sm text-gray-400 line-clamp-2">{{ course.description }}</p>
            </div>
          </div>
        </div>

        <!-- Lesson-based shelves (continue_learning, recommended, category) -->
        <div *ngIf="isLessonShelf(shelf) && shelf.data?.length > 0" class="shelf-row">
          <h2 class="text-xl md:text-2xl font-bold text-white mb-4">{{ shelf.label }}</h2>
          <div class="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            <div
              *ngFor="let lesson of shelf.data"
              class="flex-shrink-0 w-48 md:w-56 lg:w-64 cursor-pointer group"
              (click)="onLessonClick(lesson)">
              <div class="relative overflow-hidden rounded">
                <img
                  [src]="lesson.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'"
                  [alt]="lesson.title"
                  class="w-full h-32 md:h-36 lg:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div *ngIf="lesson.courseId" class="absolute top-2 left-2 bg-cyan-700/90 text-white rounded px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-semibold z-10">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                  </svg>
                  Course
                </div>
                <div *ngIf="lesson.requiredSubscriptionTier === 'pro' || lesson.requiredSubscriptionTier === 'enterprise'"
                  class="absolute top-2 right-2 z-10 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide shadow-md"
                  [ngClass]="{
                    'bg-gradient-to-r from-amber-500 to-amber-600 text-black': lesson.requiredSubscriptionTier === 'pro',
                    'bg-gradient-to-r from-purple-500 to-purple-700 text-white': lesson.requiredSubscriptionTier === 'enterprise'
                  }">
                  {{ lesson.requiredSubscriptionTier === 'enterprise' ? 'ENT' : 'PRO' }}
                </div>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <svg class="w-12 h-12 md:w-16 md:h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"></path>
                  </svg>
                </div>
              </div>
              <h3 class="text-sm md:text-base font-semibold text-white mt-2 line-clamp-2">{{ lesson.title }}</h3>
              <p class="text-xs md:text-sm text-gray-400 line-clamp-2">{{ lesson.description }}</p>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Empty state -->
      <div *ngIf="!loading && resolvedShelves.length === 0" class="text-center py-20">
        <p class="text-gray-500 text-lg">No content available yet.</p>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading" class="text-center py-20">
        <p class="text-gray-500">Loading content...</p>
      </div>
    </div>
  `,
  styles: [`
    .shelf-row {
      padding: 0.75rem 1rem;
    }
    @media (min-width: 768px) {
      .shelf-row { padding: 1rem 1.5rem; }
    }
    @media (min-width: 1024px) {
      .shelf-row { padding: 1.25rem 2rem; }
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
export class HubShelvesComponent implements OnInit, OnChanges {
  @Input() hubSlug: string = 'default';
  @Input() preloadedCategories: any[] | null = null; // For backward compat with HomeComponent

  resolvedShelves: ShelfData[] = [];
  loading = true;

  constructor(
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadShelves();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['hubSlug'] && !changes['hubSlug'].firstChange) {
      this.loadShelves();
    }
  }

  loadShelves() {
    this.loading = true;
    this.api.get<any[]>(`/hubs/by-slug/${this.hubSlug}/shelves-data`).subscribe({
      next: (shelves) => {
        this.resolvedShelves = shelves || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('[HubShelves] Failed to load shelves, falling back to empty:', err);
        this.resolvedShelves = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  isLessonShelf(shelf: ShelfData): boolean {
    return ['continue_learning', 'recommended', 'category', 'custom'].includes(shelf.type);
  }

  onLessonClick(lesson: any) {
    if (lesson.courseId) {
      this.router.navigate(['/course-overview', lesson.courseId]);
    } else {
      this.router.navigate(['/lesson-overview', lesson.id]);
    }
  }

  onCourseClick(course: any) {
    this.router.navigate(['/course-overview', course.id]);
  }
}

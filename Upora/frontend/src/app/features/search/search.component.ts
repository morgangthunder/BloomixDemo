import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { LessonService } from '../../core/services/lesson.service';
import { Observable } from 'rxjs';
import { Lesson } from '../../core/models/lesson.model';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content [scrollEvents]="true" (ionScroll)="onScroll($event)">
      <div class="bg-brand-black min-h-screen text-brand-light-gray font-sans pt-20">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">Search Results</h1>
          <p class="text-lg text-gray-400 mb-8" *ngIf="searchQuery$ | async as query">
            Showing results for "{{ query }}"
          </p>
          
          <div *ngIf="(searchResults$ | async)?.length === 0" class="text-center py-16">
            <p class="text-xl text-gray-400">No results found</p>
            <p class="text-sm text-gray-500 mt-2">Try searching for something else</p>
          </div>

          <div *ngIf="(searchResults$ | async)?.length! > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div 
              *ngFor="let lesson of searchResults$ | async" 
              class="cursor-pointer group"
              (click)="viewLesson(lesson)"
            >
              <div class="relative">
                <img 
                  [src]="lesson.thumbnailUrl" 
                  [alt]="lesson.title"
                  class="w-full h-32 md:h-40 object-cover rounded group-hover:scale-105 transition-transform duration-300"
                />
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 rounded"></div>
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
    </ion-content>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class SearchComponent implements OnInit {
  searchResults$: Observable<Lesson[]>;
  searchQuery$: Observable<string>;

  constructor(
    private lessonService: LessonService,
    private router: Router
  ) {
    this.searchResults$ = this.lessonService.searchResults$;
    this.searchQuery$ = this.lessonService.searchQuery$;
  }

  ngOnInit() {
    this.lessonService.setCurrentPage('search');
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.lessonService.updateScrollPosition(scrollTop);
  }

  viewLesson(lesson: Lesson) {
    this.lessonService.showOverview(lesson);
    this.router.navigate(['/lesson-overview', lesson.id]);
  }
}
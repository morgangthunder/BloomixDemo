import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { LessonService } from '../../core/services/lesson.service';
import { Observable } from 'rxjs';
import { Lesson } from '../../core/models/lesson.model';

@Component({
  selector: 'app-my-list',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content [scrollEvents]="true" (ionScroll)="onScroll($event)">
      <div class="bg-brand-black min-h-screen text-brand-light-gray font-sans pt-20">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-8">My List</h1>
          
          <div *ngIf="(myList$ | async)?.length === 0" class="text-center py-16">
            <p class="text-xl text-gray-400">Your list is empty</p>
            <p class="text-sm text-gray-500 mt-2">Add lessons to your list to watch them later</p>
            <button 
              (click)="goHome()"
              class="mt-6 bg-brand-red text-white font-bold py-3 px-8 rounded hover:bg-opacity-80 transition"
            >
              Browse Lessons
            </button>
          </div>

          <div *ngIf="(myList$ | async)?.length! > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div 
              *ngFor="let lesson of myList$ | async" 
              class="cursor-pointer group relative"
            >
              <div (click)="viewLesson(lesson)">
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
              <button 
                (click)="removeFromList(lesson)"
                class="absolute top-2 right-2 bg-gray-800/80 hover:bg-red-600 text-white p-2 rounded-full transition"
                title="Remove from list"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
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
export class MyListComponent implements OnInit {
  myList$: Observable<Lesson[]>;

  constructor(
    private lessonService: LessonService,
    private router: Router
  ) {
    this.myList$ = this.lessonService.myList$;
  }

  ngOnInit() {
    this.lessonService.setCurrentPage('my-list');
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.lessonService.updateScrollPosition(scrollTop);
  }

  viewLesson(lesson: Lesson) {
    this.lessonService.showOverview(lesson);
    this.router.navigate(['/lesson-overview', lesson.id]);
  }

  removeFromList(lesson: Lesson) {
    this.lessonService.toggleMyList(lesson);
  }

  goHome() {
    this.router.navigate(['/home']);
  }
}
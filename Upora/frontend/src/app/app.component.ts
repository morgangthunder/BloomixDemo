import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { HeaderComponent } from './shared/components/header/header.component';
import { LessonService } from './core/services/lesson.service';
import { Observable } from 'rxjs';
import { Lesson } from './core/models/lesson.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, IonApp, IonRouterOutlet, HeaderComponent],
  template: `
    <ion-app>
      <app-header></app-header>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
  styles: [`
    ion-app {
      background-color: #141414;
      color: #e5e5e5;
      font-family: system-ui, -apple-system, sans-serif;
    }
  `]
})
export class AppComponent implements OnInit {
  featuredLesson$: Observable<Lesson | null>;

  constructor(private lessonService: LessonService) {
    this.featuredLesson$ = new Observable(observer => {
      const featured = this.lessonService.getFeaturedLesson();
      observer.next(featured);
      observer.complete();
    });
  }

  ngOnInit() {
    // Initialize any app-wide setup here
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { HeaderComponent } from './shared/components/header/header.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LessonService } from './core/services/lesson.service';
import { AuthService } from './core/services/auth.service';
import { Observable } from 'rxjs';
import { Lesson } from './core/models/lesson.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IonApp, IonRouterOutlet, HeaderComponent, ToastComponent],
  template: `
    <ion-app>
      <app-header></app-header>
      <app-toast></app-toast>
      <div class="main-content">
        <ion-router-outlet></ion-router-outlet>
      </div>
    </ion-app>
  `,
  styles: [`
    ion-app {
      background-color: #141414;
      color: #e5e5e5;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .main-content {
      /* Removed global padding - each page controls its own spacing */
      /* This prevents overlay issues on full-page layouts */
    }
  `]
})
export class AppComponent implements OnInit {
  featuredLesson$: Observable<Lesson | null>;

  constructor(
    private lessonService: LessonService,
    private auth: AuthService,
  ) {
    this.featuredLesson$ = new Observable(observer => {
      const featured = this.lessonService.getFeaturedLesson();
      observer.next(featured);
      observer.complete();
    });
  }

  ngOnInit() {
    this.auth.initCognito();
  }
}
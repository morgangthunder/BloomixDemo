import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { LessonService } from '../../core/services/lesson.service';
import { HubShelvesComponent } from '../../shared/components/hub-shelves/hub-shelves.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonContent, HubShelvesComponent],
  template: `
    <ion-content [scrollEvents]="true" (ionScroll)="onScroll($event)">
      <div class="bg-brand-black min-h-screen text-brand-light-gray font-sans page-with-header">
        <main class="overflow-x-hidden">
          <app-hub-shelves [hubSlug]="'default'"></app-hub-shelves>
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
  `]
})
export class HomeComponent implements OnInit {
  constructor(
    private lessonService: LessonService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    // LessonService still loads categories for other parts of the app
    this.lessonService.categories$.subscribe(() => {});
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.lessonService.updateScrollPosition(scrollTop);
  }
}

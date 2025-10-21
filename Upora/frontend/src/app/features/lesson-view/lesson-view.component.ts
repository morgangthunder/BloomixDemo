import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { LessonService } from '../../core/services/lesson.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Lesson, Stage, SubStage } from '../../core/models/lesson.model';

@Component({
  selector: 'app-lesson-view',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <div class="h-screen bg-brand-dark text-white overflow-hidden flex flex-col md:flex-row">
      <!-- Mobile overlay -->
      <div *ngIf="isMobileNavOpen" 
           (click)="closeMobileNav()"
           class="fixed inset-0 bg-black/60 z-30 md:hidden"></div>

      <!-- Sidebar -->
      <aside 
        [style.width.px]="navWidth"
        [class.hidden]="navWidth === 0"
        class="h-screen bg-brand-black transition-all duration-300 ease-in-out z-40 
               fixed w-80 top-0 left-0 transform md:relative md:transform-none flex flex-col
               md:flex md:flex-shrink-0"
        [class.-translate-x-full]="!isMobileNavOpen"
        [class.translate-x-0]="isMobileNavOpen">
        
        <!-- Sidebar Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 class="text-lg font-bold truncate">{{ lesson?.title }}</h2>
          <button (click)="closeMobileNav()" class="md:hidden text-white p-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Stages List -->
        <div class="flex-1 overflow-y-auto">
          <div *ngFor="let stage of lessonStages" class="border-b border-gray-800">
            <div class="p-4 hover:bg-gray-800 cursor-pointer"
                 (click)="toggleStage(stage.id)">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h3 class="font-semibold text-white">{{ stage.title }}</h3>
                  <p class="text-sm text-gray-400">{{ stage.type }} • {{ stage.subStages.length }} sub-stages</p>
                </div>
                <div class="flex items-center space-x-2">
                  <span *ngIf="stage.passed" class="text-green-500">✓</span>
                  <svg class="w-5 h-5 transition-transform" 
                       [class.rotate-180]="expandedStages.has(stage.id)"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Sub-stages -->
            <div *ngIf="expandedStages.has(stage.id)" class="bg-gray-900">
              <div *ngFor="let subStage of stage.subStages"
                   (click)="selectSubStage(stage.id, subStage.id)"
                   [class.bg-brand-red]="activeSubStageId === subStage.id"
                   [class.bg-gray-800]="activeSubStageId !== subStage.id"
                   class="p-3 pl-8 hover:bg-gray-700 cursor-pointer border-l-4 border-transparent hover:border-brand-red transition-all">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-sm font-medium">{{ subStage.title }}</h4>
                    <p class="text-xs text-gray-400">{{ subStage.type }} • {{ subStage.duration }}min</p>
                  </div>
                  <span *ngIf="subStage.completed" class="text-green-500 text-sm">✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Exit Button -->
        <div class="p-4 border-t border-gray-700">
          <button 
            (click)="exitLesson()"
            class="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition">
            Exit Lesson
          </button>
        </div>
      </aside>

      <!-- Resize Handle (Desktop) -->
      <div 
        (mousedown)="startResize($event)"
        class="w-2 h-full bg-gray-900 hover:bg-brand-red cursor-col-resize items-center justify-center relative group hidden md:flex"
        *ngIf="navWidth > 0">
        <div class="absolute z-10 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 
                    bg-gray-700 hover:bg-brand-red text-white p-1 rounded-full 
                    opacity-0 group-hover:opacity-100 transition-opacity">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01"></path>
          </svg>
        </div>
      </div>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col h-screen relative">
        <!-- Collapse button (Desktop) -->
        <button *ngIf="navWidth === 0"
                (click)="toggleNavCollapse()"
                class="absolute hidden md:block z-20 top-6 left-4 bg-gray-800 hover:bg-brand-red text-white p-2 rounded-full transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>

        <!-- Mobile Header -->
        <header class="md:hidden flex items-center justify-between p-4 bg-brand-black border-b border-gray-700 flex-shrink-0">
          <button (click)="openMobileNav()" class="text-white p-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          <h1 class="font-semibold text-lg truncate px-2">{{ lesson?.title }}</h1>
          <div class="w-7"></div>
        </header>

        <!-- Content Area -->
        <div class="flex-1 p-6 md:p-8 lg:p-12 overflow-y-auto">
          <div *ngIf="activeSubStage; else selectPrompt">
            <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">{{ activeSubStage.title }}</h1>
            <p class="text-brand-gray mb-8">{{ activeSubStage.type }} • {{ activeSubStage.interactionType }} • {{ activeSubStage.duration }} minutes</p>

            <div class="bg-brand-black rounded-lg aspect-video flex items-center justify-center text-brand-gray">
              <div class="text-center">
                <p class="text-xl mb-4">Content for "{{ activeSubStage.title }}"</p>
                <p class="text-sm text-gray-500">Interaction Type: {{ activeSubStage.interactionType }}</p>
                
                <!-- Toggle "Passed" button for Evaluate stages -->
                <button *ngIf="activeSubStage.type === 'Evaluate'"
                        (click)="togglePassStatus()"
                        class="mt-4 bg-brand-red text-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition">
                  {{ currentStage?.passed ? 'Mark as Not Passed' : 'Mark as Passed' }}
                </button>
              </div>
            </div>
          </div>

          <ng-template #selectPrompt>
            <div class="flex items-center justify-center h-full">
              <p class="text-brand-gray text-xl">Select a lesson stage to begin.</p>
            </div>
          </ng-template>
        </div>

        <!-- Bottom Controls -->
        <div class="p-4 md:p-6 bg-brand-black border-t border-gray-700">
          <div class="flex items-center space-x-4">
            <button class="flex items-center justify-center bg-gray-700 text-white font-bold py-2 px-4 rounded hover:bg-gray-600 transition">
              <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"></path>
              </svg>
              Raise Hand
            </button>
            <div class="flex-1 relative">
              <input 
                [(ngModel)]="chatMessage"
                (keyup.enter)="sendMessage()"
                type="text"
                placeholder="Ask the AI teacher a question..."
                class="w-full bg-brand-dark border border-gray-600 rounded-lg py-2 pl-4 pr-12 text-white placeholder-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
              <button (click)="sendMessage()" 
                      class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-gray hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
  `]
})
export class LessonViewComponent implements OnInit, OnDestroy {
  lesson: Lesson | null = null;
  lessonStages: Stage[] = [];
  activeStageId: number | null = null;
  activeSubStageId: number | null = null;
  currentStage: Stage | null = null;
  activeSubStage: SubStage | null = null;
  expandedStages = new Set<number>();
  
  // Sidebar state
  isMobileNavOpen = false;
  navWidth = 280;
  private navWidthBeforeCollapse = 280;
  private isResizing = false;
  private minNavWidth = 280;
  private maxNavWidth = 600;
  
  // Chat
  chatMessage = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private lessonService: LessonService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.lessonService.activeLesson$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lesson => {
        if (lesson) {
          this.lesson = lesson;
          this.lessonStages = lesson.stages || [];
          
          // Auto-select first stage and substage if available
          if (this.lessonStages.length > 0) {
            const firstStage = this.lessonStages[0];
            this.activeStageId = firstStage.id;
            this.expandedStages.add(firstStage.id);
            
            if (firstStage.subStages.length > 0) {
              this.activeSubStageId = firstStage.subStages[0].id;
              this.updateActiveSubStage();
            }
          }
        }
      });

    // Setup mouse listeners for resize
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    window.removeEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  toggleStage(stageId: number) {
    if (this.expandedStages.has(stageId)) {
      this.expandedStages.delete(stageId);
    } else {
      this.expandedStages.add(stageId);
    }
  }

  selectSubStage(stageId: number, subStageId: number) {
    this.activeStageId = stageId;
    this.activeSubStageId = subStageId;
    this.isMobileNavOpen = false;
    
    // Mark stage as viewed
    this.lessonStages = this.lessonStages.map(stage =>
      stage.id === stageId ? { ...stage, viewed: true } : stage
    );
    
    this.updateActiveSubStage();
  }

  private updateActiveSubStage() {
    const stage = this.lessonStages.find(s => s.id === this.activeStageId);
    this.currentStage = stage || null;
    this.activeSubStage = stage?.subStages.find(ss => ss.id === this.activeSubStageId) || null;
  }

  togglePassStatus() {
    if (this.activeStageId) {
      this.lessonStages = this.lessonStages.map(stage => {
        if (stage.id === this.activeStageId) {
          return { ...stage, passed: !stage.passed };
        }
        return stage;
      });
      this.updateActiveSubStage();
    }
  }

  startResize(event: MouseEvent) {
    event.preventDefault();
    this.isResizing = true;
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= this.minNavWidth && newWidth <= this.maxNavWidth) {
        this.navWidth = newWidth;
      }
    }
  }

  private handleMouseUp() {
    this.isResizing = false;
  }

  toggleNavCollapse() {
    if (this.navWidth > 0) {
      this.navWidthBeforeCollapse = this.navWidth;
      this.navWidth = 0;
    } else {
      this.navWidth = this.navWidthBeforeCollapse;
    }
  }

  openMobileNav() {
    this.isMobileNavOpen = true;
  }

  closeMobileNav() {
    this.isMobileNavOpen = false;
  }

  sendMessage() {
    if (this.chatMessage.trim()) {
      console.log('AI chat message:', this.chatMessage);
      // TODO: Implement AI chat functionality
      this.chatMessage = '';
    }
  }

  exitLesson() {
    this.lessonService.exitLessonView();
    this.router.navigate(['/home']);
  }
}
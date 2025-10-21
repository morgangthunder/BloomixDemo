import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LessonService } from '../../core/services/lesson.service';

@Component({
  selector: 'app-interaction-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-screen bg-brand-dark text-white font-sans overflow-hidden flex flex-col md:flex-row">
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
          <h2 class="text-lg font-bold">Interaction Builder</h2>
          <button (click)="closeMobileNav()" class="md:hidden text-white p-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Events Panel -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="mb-4">
            <button 
              (click)="toggleEventsPanel()"
              class="w-full flex items-center justify-between p-3 bg-gray-800 rounded hover:bg-gray-700 transition">
              <span class="font-semibold">Available Events</span>
              <svg 
                class="w-5 h-5 transition-transform"
                [class.rotate-180]="!isEventsCollapsed"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            <div *ngIf="!isEventsCollapsed" class="mt-2 space-y-1">
              <div *ngFor="let event of mockEvents" 
                   class="p-2 bg-gray-900 rounded text-sm text-gray-300 font-mono">
                {{ event }}
              </div>
            </div>
          </div>

          <button class="w-full bg-brand-red hover:bg-opacity-80 text-white font-bold py-2 px-4 rounded transition">
            Upload n8n Workflow JSON
          </button>
        </div>

        <!-- Exit Button -->
        <div class="p-4 border-t border-gray-700">
          <button 
            (click)="goBack()"
            class="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition">
            Exit
          </button>
        </div>
      </aside>

      <!-- Resize Handle -->
      <div 
        (mousedown)="startResize($event)"
        class="w-2 h-full bg-gray-900 hover:bg-brand-red cursor-col-resize items-center justify-center relative group hidden md:flex"
        *ngIf="navWidth > 0">
        <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01"></path>
        </svg>
        <button 
          (click)="toggleNavCollapse()"
          class="absolute z-10 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 
                 bg-gray-700 hover:bg-brand-red text-white p-1 rounded-full 
                 opacity-0 group-hover:opacity-100 transition-opacity"
          [title]="navWidth === 0 ? 'Expand' : 'Collapse'">
          <svg *ngIf="navWidth > 0" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
          </svg>
          <svg *ngIf="navWidth === 0" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col h-screen relative">
        <!-- Collapse button -->
        <button *ngIf="navWidth === 0"
                (click)="toggleNavCollapse()"
                class="absolute hidden md:block z-20 top-6 left-4 bg-gray-800 hover:bg-brand-red text-white p-2 rounded-full transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
          </svg>
        </button>

        <!-- Mobile Header -->
        <header class="md:hidden flex items-center justify-between p-4 bg-brand-black border-b border-gray-700 flex-shrink-0">
          <button (click)="openMobileNav()" class="text-white p-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          <span class="font-semibold text-lg">Interaction Builder</span>
          <div class="w-7"></div>
        </header>

        <!-- Tab Selector -->
        <div class="flex items-center bg-brand-black border-b border-gray-700 px-4">
          <button 
            (click)="activeTab = 'code'"
            [class.bg-brand-red]="activeTab === 'code'"
            [class.text-white]="activeTab === 'code'"
            [class.text-gray-400]="activeTab !== 'code'"
            class="px-6 py-3 font-semibold transition-colors">
            Code
          </button>
          <button 
            (click)="activeTab = 'preview'"
            [class.bg-brand-red]="activeTab === 'preview'"
            [class.text-white]="activeTab === 'preview'"
            [class.text-gray-400]="activeTab !== 'preview'"
            class="px-6 py-3 font-semibold transition-colors">
            Preview
          </button>
          <div class="flex-1"></div>
          <button 
            (click)="togglePreviewFullscreen()"
            class="p-2 text-gray-400 hover:text-white transition-colors">
            <svg *ngIf="!isPreviewFullscreen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
            </svg>
            <svg *ngIf="isPreviewFullscreen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"></path>
            </svg>
          </button>
        </div>

        <!-- Content Area -->
        <div class="flex-1 overflow-hidden" [class.fixed]="isPreviewFullscreen" [class.inset-0]="isPreviewFullscreen" [class.z-50]="isPreviewFullscreen">
          <!-- Code Tab -->
          <div *ngIf="activeTab === 'code'" class="h-full p-6 overflow-y-auto">
            <textarea 
              [(ngModel)]="code"
              class="w-full h-full bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red resize-none"
              spellcheck="false">
            </textarea>
          </div>

          <!-- Preview Tab -->
          <div *ngIf="activeTab === 'preview'" class="h-full p-6 bg-gray-900 overflow-y-auto">
            <div class="bg-brand-black rounded-lg aspect-video flex items-center justify-center">
              <p class="text-gray-400">Interactive preview would render here</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <footer class="p-4 md:p-6 bg-brand-black border-t border-gray-700">
          <div class="flex items-center space-x-4">
            <div class="flex-1 relative">
              <input 
                [(ngModel)]="aiPrompt"
                (keyup.enter)="sendAIPrompt()"
                type="text"
                placeholder="Ask AI for help with coding..."
                class="w-full bg-brand-dark border border-gray-600 rounded-lg py-2 pl-4 pr-12 text-white placeholder-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
              <button 
                (click)="sendAIPrompt()"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-gray hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </div>
            <button 
              (click)="saveInteraction()"
              class="bg-brand-red hover:bg-opacity-80 text-white font-bold py-2 px-6 rounded transition">
              Save
            </button>
          </div>
        </footer>
      </main>

      <!-- Snackbar -->
      <div 
        [class.translate-y-0]="snackbar.visible"
        [class.opacity-100]="snackbar.visible"
        [class.translate-y-10]="!snackbar.visible"
        [class.opacity-0]="!snackbar.visible"
        class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-brand-red text-white py-2 px-6 rounded-lg shadow-lg transition-all duration-300 z-50">
        {{ snackbar.message }}
      </div>
    </div>
  `
})
export class InteractionBuilderComponent implements OnInit, OnDestroy {
  isMobileNavOpen = false;
  navWidth = 384;
  private navWidthBeforeCollapse = 384;
  private isResizing = false;
  private minNavWidth = 280;
  private maxNavWidth = 600;

  activeTab: 'code' | 'preview' = 'code';
  code = `// This is a mock code editor.
// Define your interaction logic here.

function onClick(elementId) {
  console.log(\`Element \${elementId} clicked.\`);
  // Trigger custom event
  triggerEvent('elementClicked', { id: elementId });
}

function onComplete() {
  console.log('Interaction completed.');
  // Trigger system event
  triggerEvent('completed');
}`;

  mockEvents = ['onLoad', 'onClick', 'onComplete', 'elementClicked'];
  isEventsCollapsed = true;
  isPreviewFullscreen = false;
  aiPrompt = '';
  
  snackbar = { message: '', visible: false };
  private snackbarTimeout: any = null;

  constructor(
    private lessonService: LessonService,
    private router: Router
  ) {}

  ngOnInit() {
    this.lessonService.setCurrentPage('interaction-builder');
    
    // Setup mouse listeners
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    window.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    if (this.snackbarTimeout) {
      clearTimeout(this.snackbarTimeout);
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

  toggleEventsPanel() {
    this.isEventsCollapsed = !this.isEventsCollapsed;
  }

  togglePreviewFullscreen() {
    this.isPreviewFullscreen = !this.isPreviewFullscreen;
  }

  sendAIPrompt() {
    if (this.aiPrompt.trim()) {
      console.log('AI Prompt:', this.aiPrompt);
      this.showSnackbar('AI assistance coming soon!');
      this.aiPrompt = '';
    }
  }

  saveInteraction() {
    this.showSnackbar('Interaction saved successfully!');
  }

  private showSnackbar(message: string) {
    if (this.snackbarTimeout) {
      clearTimeout(this.snackbarTimeout);
    }
    this.snackbar = { message, visible: true };
    this.snackbarTimeout = setTimeout(() => {
      this.snackbar = { message: '', visible: false };
    }, 3000);
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
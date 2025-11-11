import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LessonService } from '../../../core/services/lesson.service';
import { ApiService } from '../../../core/services/api.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { environment } from '../../../../environments/environment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface TokenUsage {
  monthlyUsage: number;
  monthlyLimit: number;
  percentUsed: number;
  remaining: number;
  subscriptionTier: string;
  resetDate: string;
  daysUntilReset: number;
  warningLevel: 'ok' | 'warning' | 'critical';
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header 
      class="fixed top-0 left-0 right-0 z-10 bg-brand-black shadow-lg">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 md:h-20">
          <div class="flex items-center space-x-4 md:space-x-8">
            <!-- Mobile Menu Button -->
            <div class="md:hidden">
              <button (click)="toggleMobileMenu()" class="text-white p-2">
                <svg *ngIf="!isMobileMenuOpen" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
                <svg *ngIf="isMobileMenuOpen" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <!-- Logo -->
            <h1 class="text-2xl md:text-3xl font-bold text-brand-red tracking-wider cursor-pointer" 
                (click)="navigateTo('home')">
              Upora
            </h1>
            
            <!-- Desktop Navigation -->
            <nav class="hidden md:flex items-center space-x-4">
              <button (click)="navigateTo('home')" 
                      [class]="getNavLinkClasses('home')">
                Home
              </button>
              <button (click)="navigateTo('categories')" 
                      [class]="getNavLinkClasses('categories')">
                Categories
              </button>
              <button (click)="navigateTo('my-list')" 
                      [class]="getNavLinkClasses('my-list')">
                My List
              </button>
              <button *ngIf="isLessonBuilder()" 
                      (click)="navigateTo('content-library')" 
                      [class]="getNavLinkClasses('content-library')">
                Content Library
              </button>
              <button *ngIf="isLessonBuilder()" 
                      (click)="navigateTo('lesson-builder')" 
                      [class]="getNavLinkClasses('lesson-builder')">
                Lesson Builder
              </button>
              <button *ngIf="isInteractionBuilder()" 
                      (click)="navigateTo('interaction-builder')" 
                      [class]="getNavLinkClasses('interaction-builder')">
                Interaction Builder
              </button>
              <button *ngIf="isSuperAdmin()" 
                      (click)="navigateTo('super-admin')" 
                      [class]="getNavLinkClasses('super-admin')">
                🔧 Super Admin
              </button>
            </nav>
          </div>
          
          <!-- Right side actions -->
          <div class="flex items-center space-x-4">
            <!-- Token Usage Indicator -->
            <div *ngIf="tokenUsage" 
                 class="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer"
                 [class.bg-green-900]="tokenUsage.warningLevel === 'ok'"
                 [class.bg-yellow-900]="tokenUsage.warningLevel === 'warning'"
                 [class.bg-red-900]="tokenUsage.warningLevel === 'critical'"
                 [class.text-green-300]="tokenUsage.warningLevel === 'ok'"
                 [class.text-yellow-300]="tokenUsage.warningLevel === 'warning'"
                 [class.text-red-300]="tokenUsage.warningLevel === 'critical'"
                 (click)="navigateTo('profile')"
                 title="Click to view usage details">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 11a2 2 0 114 0 2 2 0 01-4 0z"/>
              </svg>
              <span>{{ formatTokens(tokenUsage.monthlyUsage) }} / {{ formatTokens(tokenUsage.monthlyLimit) }}</span>
              <div class="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full transition-all duration-300"
                     [class.bg-green-400]="tokenUsage.warningLevel === 'ok'"
                     [class.bg-yellow-400]="tokenUsage.warningLevel === 'warning'"
                     [class.bg-red-400]="tokenUsage.warningLevel === 'critical'"
                     [style.width.%]="tokenUsage.percentUsed"></div>
              </div>
            </div>
            
            <!-- Search -->
            <div *ngIf="isSearchOpen" class="flex items-center space-x-2 animate-fade-in">
              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input
                #searchInput
                type="text"
                placeholder="Titles, descriptions"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
                class="bg-transparent border-b border-white text-white focus:outline-none w-32 sm:w-48 transition-all"
              />
              <button (click)="closeSearch()" class="text-white hover:text-brand-gray transition-colors">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <!-- Action buttons -->
            <div *ngIf="!isSearchOpen" class="flex items-center space-x-4">
              <button (click)="openSearch()" class="text-white hover:text-brand-gray transition-colors">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </button>
              <button class="text-white hover:text-brand-gray transition-colors">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"></path>
                </svg>
              </button>
              <button (click)="navigateTo('profile')">
                <svg 
                  class="h-8 w-8 transition-colors"
                  [class.text-blue-400]="currentPage === 'profile'"
                  [class.text-blue-500]="currentPage !== 'profile'"
                  [class.hover:text-blue-400]="currentPage !== 'profile'"
                  fill="currentColor" 
                  stroke="white"
                  viewBox="0 0 24 24"
                  stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Mobile Menu Panel -->
      <div *ngIf="isMobileMenuOpen" class="md:hidden bg-brand-black/95 absolute top-16 left-0 right-0 p-4 border-t border-gray-800">
        <nav class="flex flex-col space-y-2">
          <button (click)="navigateTo('home')" [class]="getMobileNavLinkClasses('home')">Home</button>
          <button (click)="navigateTo('categories')" [class]="getMobileNavLinkClasses('categories')">Categories</button>
          <button (click)="navigateTo('my-list')" [class]="getMobileNavLinkClasses('my-list')">My List</button>
          <button *ngIf="isLessonBuilder()" (click)="navigateTo('content-library')" [class]="getMobileNavLinkClasses('content-library')">Content Library</button>
          <button *ngIf="isLessonBuilder()" (click)="navigateTo('lesson-builder')" [class]="getMobileNavLinkClasses('lesson-builder')">Lesson Builder</button>
          <button *ngIf="isInteractionBuilder()" (click)="navigateTo('interaction-builder')" [class]="getMobileNavLinkClasses('interaction-builder')">Interaction Builder</button>
          <button *ngIf="isSuperAdmin()" (click)="navigateTo('super-admin')" [class]="getMobileNavLinkClasses('super-admin')">🔧 Super Admin</button>
        </nav>
      </div>
    </header>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
      from { 
        opacity: 0; 
        transform: translateY(-10px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  isScrolled = false;
  isSearchOpen = false;
  isMobileMenuOpen = false;
  searchQuery = '';
  currentPage = 'home';
  tokenUsage: TokenUsage | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private lessonService: LessonService,
    private router: Router,
    private apiService: ApiService,
    private wsService: WebSocketService
  ) {}

  ngOnInit() {
    this.lessonService.currentPage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(page => this.currentPage = page);

    // Subscribe to scroll position from lesson service
    this.lessonService.scrollPosition$
      .pipe(takeUntil(this.destroy$))
      .subscribe(scrollTop => {
        this.isScrolled = scrollTop > 10;
      });

    // Load token usage
    this.loadTokenUsage();

    // TODO: Subscribe to real-time token usage updates from WebSocket (Phase 3 enhancement)
    // Will be implemented when backend emits 'token-usage-update' events
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateTo(page: string) {
    this.lessonService.setCurrentPage(page);
    this.router.navigate([`/${page}`]);
    this.isMobileMenuOpen = false;
    this.closeSearch();
  }

  openSearch() {
    this.isMobileMenuOpen = false;
    this.isSearchOpen = true;
  }

  closeSearch() {
    this.isSearchOpen = false;
    this.searchQuery = '';
    this.lessonService.setSearchQuery('');
  }

  onSearchChange(query: string) {
    this.lessonService.setSearchQuery(query);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.closeSearch();
  }

  getNavLinkClasses(page: string): string {
    return `font-semibold transition-colors ${this.currentPage === page ? 'text-white' : 'text-brand-gray hover:text-white'}`;
  }

  getMobileNavLinkClasses(page: string): string {
    return `block w-full text-left p-3 text-lg rounded-md ${this.currentPage === page ? 'bg-brand-red text-white' : 'text-brand-light-gray hover:bg-gray-700'}`;
  }

  async loadTokenUsage() {
    // Token usage display in header is disabled for MVP
    // Use the Super-Admin LLM Usage page instead
    // TODO: Implement real-time token usage widget in header
    return;
  }

  formatTokens(tokens: number): string {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  }

  isLessonBuilder(): boolean {
    const role = environment.userRole;
    return role === 'lesson-builder' || role === 'admin' || role === 'super-admin';
  }

  isInteractionBuilder(): boolean {
    const role = environment.userRole;
    return role === 'interaction-builder' || role === 'admin' || role === 'super-admin';
  }

  isSuperAdmin(): boolean {
    const role = environment.userRole;
    return role === 'super-admin';
  }
}
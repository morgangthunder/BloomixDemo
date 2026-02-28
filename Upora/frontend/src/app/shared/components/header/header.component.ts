import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LessonService } from '../../../core/services/lesson.service';
import { ApiService } from '../../../core/services/api.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';
import { MessagesService } from '../../../core/services/messages.service';
import { MessagesModalComponent } from '../messages-modal/messages-modal.component';
import { HubsService, HubSummary } from '../../../core/services/hubs.service';
import { AudioService } from '../../../core/services/audio.service';
import { environment } from '../../../../environments/environment';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

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
  imports: [CommonModule, FormsModule, MessagesModalComponent],
  template: `
    <header 
      class="fixed top-0 left-0 right-0 bg-brand-black shadow-lg"
      style="z-index: 50;">
      <div class="w-full px-3 sm:px-4 lg:px-6">
        <div class="flex items-center h-16 md:h-20">
          <div class="flex items-center space-x-3 md:space-x-5 flex-shrink-0">
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

            <!-- Hub Switcher (top-left, before logo) -->
            <div class="relative hub-switcher" *ngIf="shouldShowHubSwitcher()">
              <button (click)="toggleHubDropdown($event)" class="hub-switch-btn" [class.open]="hubDropdownOpen">
                <span class="hub-switch-icon">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
                  </svg>
                </span>
                <span class="hub-switch-label">{{ hubSwitcherLabel }}</span>
              </button>
              <div *ngIf="hubDropdownOpen" class="hub-dropdown">
                <div class="hub-dropdown-header">{{ (isSuperAdmin() || isEnterprise()) ? 'Hubs' : 'Switch Hub' }}</div>
                <button *ngIf="isSuperAdmin()" (click)="goToAllContent()" class="hub-dropdown-item" [class.active]="!activeHubSlug">
                  <span class="hub-dd-icon all">U</span>
                  <span>All Content</span>
                </button>
                <div *ngIf="nonDefaultHubs.length > 0 || isSuperAdmin()" class="hub-dropdown-divider"></div>
                <button *ngFor="let h of visibleHubs" (click)="goToHub(h)" class="hub-dropdown-item" [class.active]="activeHubSlug === h.slug">
                  <span class="hub-dd-icon">{{ h.name.charAt(0).toUpperCase() }}</span>
                  <span class="truncate flex-1">{{ h.name }}</span>
                  <span *ngIf="h.myStatus === 'invited'" class="text-xs text-yellow-400 ml-auto">Invited</span>
                  <span *ngIf="h.myRole === 'owner' || h.myRole === 'admin'" (click)="goToManageHub(h, $event)" class="hub-dd-manage-icon" title="Manage">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </span>
                </button>
                <div *ngIf="canManageActiveHub()" class="hub-dropdown-divider"></div>
                <button *ngIf="canManageActiveHub()" (click)="goToManageActiveHub()" class="hub-dropdown-item hub-manage-row">
                  <span class="hub-dd-icon manage">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </span>
                  <span>{{ manageHubLabel }}</span>
                </button>
                <div *ngIf="canCreateHub()" class="hub-dropdown-divider"></div>
                <button *ngIf="canCreateHub()" (click)="goToCreateHub()" class="hub-dropdown-item hub-create-row">
                  <span class="hub-dd-icon create">+</span>
                  <span>Create Hub</span>
                </button>
              </div>
            </div>
            
            <!-- Logo (hub-aware: shows hub logo when viewing a non-default hub) -->
            <div class="flex items-center cursor-pointer relative" (click)="onLogoClick($event)">
              <!-- Hub logo (when viewing a non-default hub with a logo) -->
              <img *ngIf="activeHubSlug && activeHubSlug !== 'default' && activeHubLogo"
                   [src]="activeHubLogo"
                   class="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover border border-white/10"
                   [alt]="activeHubName" />
              <!-- Hub initial (when viewing a non-default hub without logo) -->
              <div *ngIf="activeHubSlug && activeHubSlug !== 'default' && !activeHubLogo"
                   class="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-cyan-900/60 flex items-center justify-center text-lg font-bold text-cyan-400 border border-cyan-800/40">
                {{ activeHubName?.charAt(0)?.toUpperCase() || 'H' }}
              </div>
              <!-- Default Upora logo -->
              <h1 *ngIf="!activeHubSlug || activeHubSlug === 'default'"
                  class="text-2xl md:text-3xl font-bold text-brand-red tracking-wider leading-none flex items-center"
                  style="margin-top: 1px">
                Upora
              </h1>
            </div>

            <!-- Hub info popover (shown when clicking hub logo) -->
            <div *ngIf="showHubInfoPopover && activeHubSlug && activeHubSlug !== 'default'"
                 class="hub-info-popover"
                 (click)="$event.stopPropagation()">
              <div class="flex items-center gap-3 mb-3">
                <div *ngIf="activeHubLogo" class="w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                  <img [src]="activeHubLogo" class="w-full h-full object-cover" />
                </div>
                <div *ngIf="!activeHubLogo" class="w-10 h-10 rounded-lg bg-cyan-900/60 flex items-center justify-center text-lg font-bold text-cyan-400">
                  {{ activeHubName?.charAt(0)?.toUpperCase() }}
                </div>
                <div>
                  <div class="text-white font-semibold text-sm">{{ activeHubName }}</div>
                  <div class="text-gray-500 text-xs">Hub</div>
                </div>
              </div>
              <p *ngIf="activeHubDescription" class="text-gray-400 text-xs mb-3 leading-relaxed">{{ activeHubDescription }}</p>
              <div class="flex gap-2 pt-2 border-t border-gray-800">
                <button (click)="navigateToHubHome()" class="flex-1 text-xs text-center py-1.5 bg-gray-800 rounded hover:bg-gray-700 transition text-gray-300">View Hub</button>
                <button *ngIf="activeHubRole === 'owner' || activeHubRole === 'admin'"
                        (click)="navigateToHubManage()" class="flex-1 text-xs text-center py-1.5 bg-cyan-900/40 rounded hover:bg-cyan-900/60 transition text-cyan-300">Manage</button>
              </div>
            </div>
            
            <!-- Desktop Navigation with overflow -->
            <nav class="hidden md:flex items-center space-x-2 lg:space-x-4">
              <ng-container *ngFor="let item of visibleNavItems">
                <button (click)="navigateTo(item.route)" [class]="getNavLinkClasses(item.route)">
                  {{ item.label }}
                </button>
              </ng-container>
              <!-- More dropdown for overflow items -->
              <div *ngIf="overflowNavItems.length > 0" class="relative">
                <button (click)="toggleMoreDropdown($event)" 
                        class="text-sm font-medium px-2 py-1 rounded text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors flex items-center gap-1">
                  More
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div *ngIf="moreDropdownOpen" class="absolute left-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px]" style="z-index: 60;">
                  <button *ngFor="let item of overflowNavItems"
                          (click)="navigateTo(item.route); moreDropdownOpen = false"
                          class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
                    {{ item.label }}
                  </button>
                </div>
              </div>
            </nav>
          </div>
          
          <!-- Right side actions -->
          <div class="flex items-center space-x-3 ml-auto flex-shrink-0">
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
              <button (click)="toggleAudioMute()" class="text-white hover:text-brand-gray transition-colors" [title]="audioMuted ? 'Unmute sounds' : 'Mute sounds'">
                <svg *ngIf="!audioMuted" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.5H4a1 1 0 00-1 1v5a1 1 0 001 1h2.5l4.5 4V4.5l-4.5 4z" />
                </svg>
                <svg *ngIf="audioMuted" class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              </button>
              <button class="bell-btn text-white hover:text-brand-gray transition-colors" (click)="toggleMessagesModal()" title="Messages">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"></path>
                </svg>
                <span *ngIf="unreadCount > 0" class="unread-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
              </button>
              <button *ngIf="auth.isAuthenticated()" (click)="signOut()" class="text-gray-400 hover:text-white text-sm">
                Sign out
              </button>
              <button *ngIf="!auth.isAuthenticated()" (click)="navigateToLogin()" class="text-brand-red hover:text-red-400 text-sm font-medium">
                Sign in
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
          <button (click)="navigateTo('my-lessons')" [class]="getMobileNavLinkClasses('my-lessons')">My Lessons</button>
          <button (click)="navigateTo('categories')" [class]="getMobileNavLinkClasses('categories')">Categories</button>
          <button (click)="navigateTo('my-list')" [class]="getMobileNavLinkClasses('my-list')">My List</button>
          <button *ngIf="feedbackEnabled" (click)="navigateTo('feedback')" [class]="getMobileNavLinkClasses('feedback')">Feedback</button>
          <button *ngIf="isLessonBuilder()" (click)="navigateTo('content-library')" [class]="getMobileNavLinkClasses('content-library')">Content Library</button>
          <button *ngIf="isLessonBuilder()" (click)="navigateTo('lesson-builder')" [class]="getMobileNavLinkClasses('lesson-builder')">Lesson Builder</button>
          <button *ngIf="isInteractionBuilder()" (click)="navigateTo('interaction-builder')" [class]="getMobileNavLinkClasses('interaction-builder')">Interaction Builder</button>
          <button *ngIf="isSuperAdmin()" (click)="navigateTo('super-admin')" [class]="getMobileNavLinkClasses('super-admin')">🔧 Super Admin</button>
          <div *ngIf="shouldShowHubSwitcher()" class="border-t border-gray-700 pt-2 mt-2">
            <p class="text-xs text-gray-500 px-3 pb-1">{{ (isSuperAdmin() || isEnterprise()) ? 'Hubs' : 'Switch Hub' }}</p>
            <button *ngIf="isSuperAdmin()" (click)="goToAllContent()" class="block w-full text-left p-3 text-lg rounded-md text-brand-light-gray hover:bg-gray-700">All Content</button>
            <button *ngFor="let h of visibleHubs" (click)="goToHub(h)" class="block w-full text-left p-3 text-lg rounded-md text-brand-light-gray hover:bg-gray-700">
              {{ h.name }}
              <span *ngIf="h.myRole === 'owner' || h.myRole === 'admin'" class="text-xs text-cyan-400 ml-2">({{ h.myRole }})</span>
            </button>
            <button *ngIf="canManageActiveHub()" (click)="goToManageActiveHub()" class="block w-full text-left p-3 text-lg rounded-md text-cyan-400 hover:bg-gray-700">⚙ {{ manageHubLabel }}</button>
            <button *ngIf="canCreateHub()" (click)="goToCreateHub()" class="block w-full text-left p-3 text-lg rounded-md text-cyan-400 hover:bg-gray-700">+ Create Hub</button>
          </div>
        </nav>
      </div>
    </header>
    <!-- Messages Modal (opened by bell icon) -->
    <app-messages-modal
      *ngIf="showMessagesModal"
      [skipHideNav]="true"
      [onClose]="closeMessagesModal.bind(this)"
      (messageRead)="onMessageRead()">
    </app-messages-modal>
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
    .bell-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .unread-badge {
      position: absolute;
      top: -6px;
      right: -8px;
      background: #ef4444;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      line-height: 1;
      border: 2px solid #0f0f23;
    }

    /* ─── Hub Switcher (Netflix profile-switch style, top-left) ─── */
    .hub-switcher { position: relative; z-index: 60; }

    .hub-switch-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px 5px 7px;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.75);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.8rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .hub-switch-btn:hover, .hub-switch-btn.open {
      background: rgba(0,212,255,0.08);
      border-color: rgba(0,212,255,0.3);
      color: #fff;
    }
    .hub-switch-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(0,212,255,0.7);
    }
    .hub-switch-label { letter-spacing: 0.02em; }

    .hub-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      background: #141425;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px;
      min-width: 240px;
      padding: 0;
      box-shadow: 0 12px 36px rgba(0,0,0,0.55);
      z-index: 200;
      overflow: hidden;
    }
    .hub-dropdown-header {
      padding: 10px 14px 6px;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.35);
    }
    .hub-dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      text-align: left;
      padding: 8px 14px;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.8);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background 0.12s;
    }
    .hub-dropdown-item:hover { background: rgba(255,255,255,0.06); }
    .hub-dropdown-item.active {
      background: rgba(0,212,255,0.08);
      color: #fff;
    }
    .hub-dropdown-item.active .hub-dd-icon { border-color: #00d4ff; }
    .hub-dropdown-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 2px 0; }

    .hub-dd-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px; height: 30px;
      border-radius: 8px;
      background: rgba(0,212,255,0.12);
      color: #00d4ff;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
      border: 2px solid transparent;
      transition: border-color 0.15s;
    }
    .hub-dd-icon.all {
      background: rgba(239,68,68,0.15);
      color: #e74c3c;
    }
    .hub-dd-icon.create {
      background: rgba(0,212,255,0.08);
      color: rgba(0,212,255,0.6);
      font-size: 1rem;
    }
    .hub-dd-icon.manage {
      background: rgba(168,85,247,0.12);
      color: #a855f7;
    }
    .hub-manage-row { color: rgba(168,85,247,0.9); }
    .hub-manage-row:hover { color: #a855f7; }
    .hub-create-row { color: rgba(0,212,255,0.8); }
    .hub-create-row:hover { color: #00d4ff; }
    .hub-dd-manage-icon {
      margin-left: auto;
      color: rgba(168,85,247,0.6);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
      display: flex; align-items: center;
    }
    .hub-dd-manage-icon:hover { color: #a855f7; background: rgba(168,85,247,0.12); }

    /* Hub info popover */
    .hub-info-popover {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      z-index: 200;
      min-width: 260px;
      max-width: 300px;
      padding: 14px;
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.6);
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
  unreadCount = 0;
  showMessagesModal = false;
  feedbackEnabled = false;
  hubDropdownOpen = false;
  moreDropdownOpen = false;
  myHubs: HubSummary[] = [];
  activeHubSlug: string | null = null;
  activeHubLogo: string | null = null;
  activeHubName: string | null = null;
  activeHubDescription: string | null = null;
  activeHubRole: string | null = null;
  showHubInfoPopover = false;
  audioMuted = false;
  
  /** Maximum visible nav items before overflow into "More" dropdown */
  private readonly MAX_VISIBLE_NAV = 4;
  private moreDropdownListener: any;
  private destroy$ = new Subject<void>();
  private hubDropdownListener: any;

  constructor(
    private lessonService: LessonService,
    private router: Router,
    private apiService: ApiService,
    private wsService: WebSocketService,
    private messagesService: MessagesService,
    private hubsService: HubsService,
    private audioService: AudioService,
    public auth: AuthService,
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

    // Audio mute state
    this.audioService.muted$.pipe(takeUntil(this.destroy$)).subscribe(m => this.audioMuted = m);

    // Load token usage
    this.loadTokenUsage();

    // Load unread message count
    this.loadUnreadCount();

    // Load feedback enabled flag from profile
    this.loadFeedbackEnabled();

    // Join user-specific WebSocket room for real-time notifications
    this.joinUserRoomWhenReady();

    // Load hubs for hub switcher
    this.loadMyHubs();

    // Track active hub slug
    this.hubsService.activeHub$
      .pipe(takeUntil(this.destroy$))
      .subscribe(hub => {
        this.activeHubSlug = hub?.slug || null;
        this.activeHubLogo = hub?.logoUrl || null;
        this.activeHubName = hub?.name || null;
        this.activeHubDescription = hub?.description || null;
        this.activeHubRole = hub?.myRole || null;
        this.showHubInfoPopover = false;
      });

    // Close hub dropdown on outside click
    this.hubDropdownListener = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.hub-switcher')) {
        this.hubDropdownOpen = false;
      }
      if (!target.closest('.hub-info-popover') && !target.closest('[class*="cursor-pointer"]')) {
        this.showHubInfoPopover = false;
      }
    };
    document.addEventListener('click', this.hubDropdownListener);

    // Listen for real-time new messages via WebSocket
    this.wsService.newMessage$
      .pipe(
        takeUntil(this.destroy$),
        filter((msg) => msg !== null),
      )
      .subscribe(() => {
        this.unreadCount++;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.hubDropdownListener) {
      document.removeEventListener('click', this.hubDropdownListener);
    }
    if (this.moreDropdownListener) {
      document.removeEventListener('click', this.moreDropdownListener);
    }
  }

  navigateTo(page: string) {
    this.lessonService.setCurrentPage(page);
    this.router.navigate([`/${page}`]);
    this.isMobileMenuOpen = false;
    this.closeSearch();
  }

  async signOut() {
    const confirmed = confirm('Are you sure you want to sign out?');
    if (confirmed) {
      await this.auth.signOut();
      this.navigateTo('home');
    }
  }

  navigateToLogin() {
    const returnUrl = this.router.url || '/home';
    this.router.navigate(['/login'], { queryParams: { returnUrl } });
    this.isMobileMenuOpen = false;
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

  loadUnreadCount() {
    if (!this.auth.isAuthenticated()) return;
    this.messagesService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { this.unreadCount = res.count || 0; },
        error: () => {},
      });
  }

  toggleAudioMute() {
    this.audioService.toggleMute();
  }

  toggleMessagesModal() {
    this.showMessagesModal = !this.showMessagesModal;
    if (this.showMessagesModal) {
      // Refresh unread count when opening
      this.loadUnreadCount();
    }
  }

  closeMessagesModal() {
    this.showMessagesModal = false;
    // Refresh unread count when modal closes (user may have read messages)
    this.loadUnreadCount();
  }

  onMessageRead() {
    // Re-fetch actual count from backend to stay in sync (handles mark-all-as-read too)
    this.loadUnreadCount();
  }

  private joinUserRoomWhenReady(retries = 5) {
    const myUserId = this.auth.getUserId();
    if (myUserId) {
      this.wsService.connect();
      this.wsService.joinUserRoom(myUserId);
    } else if (retries > 0) {
      setTimeout(() => this.joinUserRoomWhenReady(retries - 1), 1000);
    }
  }

  loadFeedbackEnabled(retries = 5) {
    if (!this.auth.isAuthenticated()) {
      if (retries > 0) setTimeout(() => this.loadFeedbackEnabled(retries - 1), 1000);
      return;
    }
    this.apiService.get<any>('/profile/dashboard')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.feedbackEnabled = data?.account?.feedbackEnabled ?? false;
        },
        error: () => { this.feedbackEnabled = false; },
      });
  }

  // ─── Hub Switcher ───

  /** Show hub switcher to: super-admins, enterprise users, or users with >1 hub */
  shouldShowHubSwitcher(): boolean {
    if (!this.auth.isAuthenticated()) return false;
    if (this.isSuperAdmin() || this.isEnterprise()) return true;
    const nonDefaultHubs = this.myHubs.filter(h => h.slug !== 'default');
    return nonDefaultHubs.length > 0;
  }

  get hubSwitcherLabel(): string {
    if (this.isSuperAdmin() || this.isEnterprise()) return 'Hubs';
    return 'Switch Hub';
  }

  loadMyHubs() {
    if (!this.auth.isAuthenticated()) return;
    this.hubsService.getMyHubs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (hubs) => { this.myHubs = hubs; },
        error: () => {},
      });
  }

  toggleHubDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.hubDropdownOpen = !this.hubDropdownOpen;
    if (this.hubDropdownOpen && this.myHubs.length === 0) {
      this.loadMyHubs();
    }
  }

  goToHub(hub: HubSummary) {
    this.hubDropdownOpen = false;
    this.isMobileMenuOpen = false;
    this.activeHubSlug = hub.slug;
    this.hubsService.setActiveHub(hub);
    this.router.navigate(['/hubs', hub.slug]);
  }

  goToAllContent() {
    this.hubDropdownOpen = false;
    this.isMobileMenuOpen = false;
    this.activeHubSlug = null;
    this.activeHubLogo = null;
    this.activeHubName = null;
    this.activeHubDescription = null;
    this.activeHubRole = null;
    this.showHubInfoPopover = false;
    this.hubsService.setActiveHub(null);
    this.router.navigate(['/home']);
  }

  onLogoClick(event: Event) {
    event.stopPropagation();
    if (this.activeHubSlug && this.activeHubSlug !== 'default') {
      this.showHubInfoPopover = !this.showHubInfoPopover;
    } else {
      this.router.navigate(['/home']);
    }
  }

  navigateToHubHome() {
    this.showHubInfoPopover = false;
    if (this.activeHubSlug) {
      this.router.navigate(['/hubs', this.activeHubSlug]);
    }
  }

  navigateToHubManage() {
    this.showHubInfoPopover = false;
    if (this.activeHubSlug) {
      this.router.navigate(['/hubs', this.activeHubSlug, 'manage']);
    }
  }

  goToCreateHub() {
    this.hubDropdownOpen = false;
    this.isMobileMenuOpen = false;
    this.router.navigate(['/hubs/create']);
  }

  formatTokens(tokens: number): string {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  }

  isLessonBuilder(): boolean {
    const role = this.auth.getRole();
    return role === 'lesson-builder' || role === 'admin' || role === 'super-admin';
  }

  isInteractionBuilder(): boolean {
    const role = this.auth.getRole();
    return role === 'interaction-builder' || role === 'admin' || role === 'super-admin';
  }

  isSuperAdmin(): boolean {
    const role = this.auth.getRole();
    return role === 'super-admin' || role === 'admin';
  }

  isEnterprise(): boolean {
    return this.auth.getSubscriptionTier() === 'enterprise';
  }

  canCreateHub(): boolean {
    return this.isSuperAdmin() || this.isEnterprise();
  }

  get manageHubLabel(): string {
    return this.myHubs.length <= 1 ? 'Manage Hub' : 'Manage Selected';
  }

  get nonDefaultHubs(): any[] {
    return this.myHubs.filter(h => h.slug !== 'default');
  }

  get visibleHubs(): any[] {
    if (this.isSuperAdmin()) return this.myHubs;
    return this.nonDefaultHubs;
  }

  canManageActiveHub(): boolean {
    if (!this.activeHubSlug) return false;
    const hub = this.myHubs.find(h => h.slug === this.activeHubSlug);
    if (!hub) return false;
    return hub.myRole === 'owner' || hub.myRole === 'admin';
  }

  goToManageActiveHub() {
    this.hubDropdownOpen = false;
    this.isMobileMenuOpen = false;
    if (this.activeHubSlug) {
      this.router.navigate(['/hubs', this.activeHubSlug, 'manage']);
    }
  }

  goToManageHub(hub: any, event: Event) {
    event.stopPropagation();
    this.hubDropdownOpen = false;
    this.isMobileMenuOpen = false;
    this.router.navigate(['/hubs', hub.slug, 'manage']);
  }

  /** Build the full list of nav items based on user role */
  get allNavItems(): { route: string; label: string }[] {
    const items: { route: string; label: string }[] = [
      { route: 'home', label: 'Home' },
      { route: 'my-lessons', label: 'My Lessons' },
      { route: 'categories', label: 'Categories' },
      { route: 'my-list', label: 'My List' },
    ];
    if (this.feedbackEnabled) items.push({ route: 'feedback', label: 'Feedback' });
    if (this.isLessonBuilder()) {
      items.push({ route: 'content-library', label: 'Content Library' });
      items.push({ route: 'lesson-builder', label: 'Lesson Builder' });
    }
    if (this.isInteractionBuilder()) {
      items.push({ route: 'interaction-builder', label: 'Interaction Builder' });
    }
    if (this.isSuperAdmin()) {
      items.push({ route: 'super-admin', label: 'Super Admin' });
    }
    return items;
  }

  get visibleNavItems(): { route: string; label: string }[] {
    const all = this.allNavItems;
    if (all.length <= this.MAX_VISIBLE_NAV + 1) return all;
    return all.slice(0, this.MAX_VISIBLE_NAV);
  }

  get overflowNavItems(): { route: string; label: string }[] {
    const all = this.allNavItems;
    if (all.length <= this.MAX_VISIBLE_NAV + 1) return [];
    return all.slice(this.MAX_VISIBLE_NAV);
  }

  toggleMoreDropdown(event: Event) {
    event.stopPropagation();
    this.moreDropdownOpen = !this.moreDropdownOpen;
    if (this.moreDropdownOpen) {
      this.hubDropdownOpen = false;
      this.showHubInfoPopover = false;
      setTimeout(() => {
        this.moreDropdownListener = (e: Event) => {
          this.moreDropdownOpen = false;
          document.removeEventListener('click', this.moreDropdownListener);
        };
        document.addEventListener('click', this.moreDropdownListener);
      });
    }
  }
}
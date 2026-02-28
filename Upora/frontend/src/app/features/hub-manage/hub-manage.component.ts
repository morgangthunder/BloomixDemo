import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import {
  HubsService,
  HubDetail,
  HubMember,
  HubContentResponse,
  HubContentItem,
  HubCourseItem,
} from '../../core/services/hubs.service';
import { CoursesService } from '../../core/services/courses.service';
import { ApiService } from '../../core/services/api.service';
import { OnboardingService } from '../../core/services/onboarding.service';

type ManageTab = 'overview' | 'members' | 'content' | 'shelves' | 'settings';

@Component({
  selector: 'app-hub-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, DragDropModule],
  template: `
    <ion-content>
    <div class="min-h-screen bg-brand-black text-white pt-20">
      <div class="container mx-auto px-4 py-6 max-w-5xl">
        <!-- Back -->
        <button (click)="goBack()" class="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back
        </button>

        <div *ngIf="loading" class="text-gray-400 text-center py-12">Loading hub...</div>

        <div *ngIf="!loading && hub">
          <!-- Header -->
          <div class="flex items-center gap-4 mb-6">
            <div *ngIf="hub.logoUrl" class="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
              <img [src]="hub.logoUrl" class="w-full h-full object-cover" />
            </div>
            <div *ngIf="!hub.logoUrl" class="w-12 h-12 rounded-lg bg-cyan-900/30 flex items-center justify-center text-cyan-400 text-xl font-bold flex-shrink-0">
              {{ hub.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h1 class="text-2xl font-bold">{{ hub.name }}</h1>
              <div class="flex items-center gap-2 text-sm text-gray-400">
                <span>/hubs/{{ hub.slug }}</span>
                <span class="px-2 py-0.5 rounded text-xs" [class.bg-cyan-900]="hub.type === 'upora_domain'" [class.text-cyan-300]="hub.type === 'upora_domain'" [class.bg-purple-900]="hub.type === 'embedded_blob'" [class.text-purple-300]="hub.type === 'embedded_blob'">
                  {{ hub.type === 'upora_domain' ? 'Upora Domain' : 'Embeddable' }}
                </span>
                <span *ngIf="hub.isPublic" class="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded">Public</span>
                <span *ngIf="!hub.isPublic" class="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">Invite Only</span>
              </div>
            </div>
            <button (click)="router.navigate(['/hubs', hub.slug])" class="ml-auto text-sm bg-cyan-900/50 text-cyan-400 border border-cyan-800 px-4 py-1.5 rounded hover:bg-cyan-800/50 transition">
              View Hub Page
            </button>
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 mb-6 overflow-x-auto border-b border-gray-800 pb-0">
            <button *ngFor="let t of tabs"
                    (click)="activeTab = t.id; loadTabData()"
                    class="px-4 py-2 text-sm rounded-t transition whitespace-nowrap"
                    [class.bg-gray-800]="activeTab === t.id"
                    [class.text-white]="activeTab === t.id"
                    [class.text-gray-500]="activeTab !== t.id"
                    [class.border-b-2]="activeTab === t.id"
                    [class.border-cyan-500]="activeTab === t.id">
              {{ t.label }}
            </button>
          </div>

          <!-- ═══ OVERVIEW TAB ═══ -->
          <div *ngIf="activeTab === 'overview'" class="space-y-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="stat-card">
                <div class="stat-number">{{ hub.memberCount }}</div>
                <div class="stat-label">Members</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">{{ hub.contentCount }}</div>
                <div class="stat-label">Content Items</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">{{ hub.isPublic ? 'Public' : 'Private' }}</div>
                <div class="stat-label">Visibility</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">{{ hub.myRole || 'N/A' }}</div>
                <div class="stat-label">Your Role</div>
              </div>
            </div>
            <div *ngIf="hub.description" class="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 class="text-sm text-gray-400 mb-1">Description</h3>
              <p class="text-white">{{ hub.description }}</p>
            </div>
          </div>

          <!-- ═══ MEMBERS TAB ═══ -->
          <div *ngIf="activeTab === 'members'">
            <div class="flex justify-between items-center mb-4 gap-3">
              <input [(ngModel)]="memberSearch" (input)="searchMembers()" placeholder="Search members..." class="form-input flex-1 max-w-xs" />
              <button (click)="showInvite = true" class="btn-primary">Invite Members</button>
            </div>
            <div *ngIf="loadingMembers" class="text-gray-400 text-center py-8">Loading...</div>
            <div *ngIf="!loadingMembers && members.length === 0" class="text-gray-500 text-center py-8">No members yet.</div>
            <div class="space-y-2">
              <div *ngFor="let m of members" class="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span class="text-white font-medium">{{ m.name }}</span>
                  <span class="text-gray-500 text-sm ml-2">{{ m.email }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span *ngIf="m.status === 'invited'" class="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded">Invited</span>
                  <select *ngIf="m.role !== 'owner' && isAdmin" [ngModel]="m.role" (ngModelChange)="changeRole(m, $event)" class="bg-gray-800 text-sm text-gray-300 border border-gray-700 rounded px-2 py-1">
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                    <option value="member">Member</option>
                  </select>
                  <span *ngIf="m.role === 'owner'" class="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded">Owner</span>
                  <button *ngIf="m.role !== 'owner' && isAdmin" (click)="removeMemberConfirm(m)" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Invite Modal -->
          <div *ngIf="showInvite" class="modal-overlay" (click)="showInvite = false">
            <div class="modal-card" (click)="$event.stopPropagation()">
              <h3 class="text-lg font-semibold mb-2">Invite Members</h3>
              <p class="text-sm text-gray-400 mb-3">Enter email addresses (one per line or comma-separated).</p>
              <textarea [(ngModel)]="inviteEmails" placeholder="user1&#64;example.com&#10;user2&#64;example.com" class="form-input" rows="5"></textarea>
              <div *ngIf="inviteResult" class="mt-2 text-sm">
                <span *ngIf="inviteResult.invited > 0" class="text-green-400">{{ inviteResult.invited }} invited. </span>
                <span *ngIf="inviteResult.alreadyMember > 0" class="text-yellow-400">{{ inviteResult.alreadyMember }} already members. </span>
                <span *ngFor="let e of inviteResult.errors" class="text-red-400 block">{{ e }}</span>
              </div>
              <div class="flex justify-end gap-2 mt-4">
                <button (click)="showInvite = false" class="btn-secondary">Close</button>
                <button (click)="sendInvites()" [disabled]="inviteSending || !inviteEmails.trim()" class="btn-primary">
                  {{ inviteSending ? 'Sending...' : 'Send Invitations' }}
                </button>
              </div>
            </div>
          </div>

          <!-- ═══ CONTENT TAB ═══ -->
          <div *ngIf="activeTab === 'content'">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold">Hub Content</h3>
              <button (click)="openAddContent()" class="btn-primary">+ Add Content</button>
            </div>
            <div *ngIf="loadingContent" class="text-gray-400 text-center py-8">Loading...</div>

            <div *ngIf="!loadingContent">
              <!-- Courses -->
              <div *ngIf="hubCourses.length > 0" class="mb-6">
                <h4 class="text-sm text-gray-400 mb-2 uppercase tracking-wider">Courses</h4>
                <div class="space-y-2">
                  <div *ngFor="let c of hubCourses" class="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <span class="text-white font-medium">{{ c.title }}</span>
                      <span class="text-xs text-gray-500 ml-2">{{ c.lessons?.length || 0 }} lessons</span>
                    </div>
                    <button *ngIf="isAdmin" (click)="unlinkContent(c.linkId)" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
                  </div>
                </div>
              </div>

              <!-- Lessons -->
              <div *ngIf="hubLessons.length > 0">
                <h4 class="text-sm text-gray-400 mb-2 uppercase tracking-wider">Lessons</h4>
                <div class="space-y-2">
                  <div *ngFor="let l of hubLessons" class="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div *ngIf="l.thumbnailUrl" class="w-16 h-10 rounded bg-gray-800 overflow-hidden flex-shrink-0">
                        <img [src]="l.thumbnailUrl" class="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span class="text-white font-medium">{{ l.title }}</span>
                        <span class="text-xs text-gray-500 ml-2">{{ l.category || '' }}</span>
                      </div>
                    </div>
                    <button *ngIf="isAdmin" (click)="unlinkContent(l.linkId)" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
                  </div>
                </div>
              </div>

              <div *ngIf="hubLessons.length === 0 && hubCourses.length === 0" class="text-gray-500 text-center py-8">
                No content linked yet. Click "+ Add Content" to get started.
              </div>
            </div>
          </div>

          <!-- Add Content Modal -->
          <div *ngIf="showAddContent" class="modal-overlay" (click)="showAddContent = false">
            <div class="modal-card modal-wide" (click)="$event.stopPropagation()">
              <h3 class="text-lg font-semibold mb-3">Add Content to Hub</h3>
              <input [(ngModel)]="contentSearch" (input)="filterContent()" placeholder="Search by title..." class="form-input mb-3" />
              <div *ngIf="loadingAvailable" class="text-gray-400 text-center py-4">Loading...</div>
              <div class="available-list">
                <div *ngFor="let item of filteredAvailable" class="available-row">
                  <div>
                    <span class="text-white text-sm">{{ item.title }}</span>
                    <span class="text-xs text-gray-500 ml-2">{{ item.itemType === 'course' ? 'Course' : 'Lesson' }}</span>
                  </div>
                  <button (click)="addContent(item)" [disabled]="addingId === item.id" class="btn-sm">
                    {{ addingId === item.id ? 'Adding...' : 'Add' }}
                  </button>
                </div>
                <div *ngIf="!loadingAvailable && filteredAvailable.length === 0" class="text-gray-500 text-center py-4 text-sm">
                  {{ contentSearch ? 'No matching content found.' : 'No content available to add.' }}
                </div>
              </div>
              <div class="flex justify-end mt-4">
                <button (click)="showAddContent = false" class="btn-secondary">Close</button>
              </div>
            </div>
          </div>

          <!-- ═══ SHELVES TAB ═══ -->
          <div *ngIf="activeTab === 'shelves'">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h3 class="text-lg font-semibold">Homepage Shelves</h3>
                <p class="text-xs text-gray-500 mt-1">Configure and reorder the content shelves shown on your hub's homepage.</p>
              </div>
              <div class="flex gap-2">
                <button (click)="previewHub()" class="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition border border-gray-700">
                  Preview
                </button>
                <button (click)="showAddShelfModal = true" class="btn-primary text-sm">+ Add Shelf</button>
              </div>
            </div>

            <div *ngIf="shelvesLoading" class="text-gray-400 text-center py-8">Loading shelves...</div>

            <!-- Shelf list with drag reorder -->
            <div *ngIf="!shelvesLoading" cdkDropList (cdkDropListDropped)="onShelfDrop($event)" class="space-y-2">
              <div *ngFor="let shelf of shelves; let i = index"
                   cdkDrag
                   class="shelf-row-item">
                <div class="flex items-center gap-3 p-3">
                  <!-- Drag handle -->
                  <div cdkDragHandle class="cursor-grab text-gray-600 hover:text-gray-400 flex-shrink-0">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
                  </div>

                  <!-- Shelf info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <input *ngIf="editingShelfId === shelf.id"
                             [(ngModel)]="shelf.label"
                             class="form-input text-sm py-1 px-2 w-48"
                             (blur)="editingShelfId = null"
                             (keyup.enter)="editingShelfId = null" />
                      <span *ngIf="editingShelfId !== shelf.id" class="text-sm font-medium text-white cursor-pointer" (click)="editingShelfId = shelf.id">{{ shelf.label }}</span>
                      <span class="shelf-type-badge" [attr.data-type]="shelf.type">{{ getShelfTypeBadge(shelf.type) }}</span>
                    </div>
                    <div *ngIf="shelf.config?.category" class="text-xs text-gray-500 mt-0.5">Category: {{ shelf.config.category }}</div>
                    <div *ngIf="shelf.type === 'featured' && shelf.config?.mode === 'specific' && shelf.config?.lessonTitle" class="text-xs text-gray-500 mt-0.5">Pinned: {{ shelf.config.lessonTitle }}</div>
                    <div *ngIf="shelf.type === 'featured' && shelf.config?.mode === 'auto'" class="text-xs text-gray-500 mt-0.5">Auto: most popular in user's learning areas</div>
                    <div *ngIf="shelf.type === 'custom' && shelf.config?.lessonIds?.length" class="text-xs text-gray-500 mt-0.5">{{ shelf.config.lessonIds.length }} lesson{{ shelf.config.lessonIds.length !== 1 ? 's' : '' }} selected</div>
                  </div>

                  <!-- Enable/disable toggle -->
                  <label class="shelf-toggle">
                    <input type="checkbox" [(ngModel)]="shelf.enabled" />
                    <span class="shelf-toggle-track">
                      <span class="shelf-toggle-thumb"></span>
                    </span>
                  </label>

                  <!-- Configure (for featured, category, courses, custom shelves) -->
                  <button *ngIf="shelf.type === 'featured' || shelf.type === 'category' || shelf.type === 'courses' || shelf.type === 'custom'"
                          (click)="openShelfConfig(shelf)"
                          class="text-gray-500 hover:text-gray-300 transition"
                          title="Configure shelf">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </button>

                  <!-- Delete -->
                  <button *ngIf="shelf.type !== 'featured'"
                          (click)="removeShelf(i)"
                          class="text-gray-600 hover:text-red-400 transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="shelvesError" class="text-red-400 text-sm mt-3">{{ shelvesError }}</div>
            <div *ngIf="shelvesSuccess" class="text-green-400 text-sm mt-3">{{ shelvesSuccess }}</div>

            <div class="flex gap-2 mt-4">
              <button (click)="saveShelves()" [disabled]="shelvesSaving" class="btn-primary">
                {{ shelvesSaving ? 'Saving...' : 'Save Shelf Order' }}
              </button>
            </div>

            <!-- Add Shelf Modal -->
            <div *ngIf="showAddShelfModal" class="modal-backdrop" (click)="showAddShelfModal = false">
              <div class="modal-content max-w-md" (click)="$event.stopPropagation()">
                <h3 class="text-lg font-semibold mb-4">Add Shelf</h3>
                <div class="space-y-3">
                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Shelf Type</label>
                    <select [(ngModel)]="newShelfType" (ngModelChange)="onShelfTypeChange()" class="form-select">
                      <option value="category">Category</option>
                      <option value="custom">Custom (Manual)</option>
                      <option value="courses">Courses</option>
                      <option value="continue_learning">Continue Learning (Auto)</option>
                      <option value="recommended">Recommended (Auto)</option>
                      <option value="featured">Featured Hero</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Shelf Name</label>
                    <input [(ngModel)]="newShelfName" class="form-input" placeholder="e.g. For the Nerds" />
                    <p class="text-xs text-gray-600 mt-1">The heading shown on the homepage.</p>
                  </div>

                  <!-- Learning area tags (for category shelves) -->
                  <div *ngIf="newShelfType === 'category'">
                    <label class="block text-sm text-gray-400 mb-1">Learning Areas</label>
                    <div class="relative">
                      <div class="flex flex-wrap gap-1 mb-1" *ngIf="newShelfLabels.length > 0">
                        <span *ngFor="let lbl of newShelfLabels; let li = index"
                              class="inline-flex items-center gap-1 bg-cyan-900/40 text-cyan-300 text-xs px-2 py-0.5 rounded">
                          {{ lbl }}
                          <button (click)="newShelfLabels.splice(li, 1)" class="hover:text-red-400 ml-0.5">&times;</button>
                        </span>
                      </div>
                      <input [(ngModel)]="newShelfLabelInput"
                             (input)="onShelfLabelInput($event)"
                             (keydown.enter)="confirmLabelSuggestion($event)"
                             class="form-input" placeholder="Type to search learning areas..." />
                      <div *ngIf="shelfLabelSuggestions.length > 0" class="absolute left-0 right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-40 overflow-y-auto" style="z-index: 10;">
                        <button *ngFor="let s of shelfLabelSuggestions"
                                (click)="pickLabelSuggestion(s)"
                                class="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition">
                          {{ s }}
                        </button>
                      </div>
                    </div>
                    <p class="text-xs text-gray-600 mt-1">Lessons matching these learning areas will populate this shelf.</p>
                  </div>

                  <!-- Info for custom shelves -->
                  <div *ngIf="newShelfType === 'custom'" class="bg-gray-900 rounded-lg p-3 border border-gray-800">
                    <p class="text-xs text-gray-400">After adding, use the <span class="text-cyan-400">settings cog</span> to pick which lessons appear in this shelf.</p>
                  </div>
                </div>
                <div class="flex gap-2 mt-4">
                  <button (click)="addShelf()" [disabled]="!newShelfName.trim() && newShelfLabels.length === 0 && newShelfType !== 'continue_learning' && newShelfType !== 'recommended' && newShelfType !== 'featured'" class="btn-primary flex-1">Add</button>
                  <button (click)="showAddShelfModal = false" class="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex-1">Cancel</button>
                </div>
              </div>
            </div>

            <!-- Custom Shelf Config Modal (lesson picker) -->
            <div *ngIf="showCustomShelfConfigModal" class="modal-backdrop" (click)="showCustomShelfConfigModal = false">
              <div class="modal-content max-w-lg" (click)="$event.stopPropagation()">
                <h3 class="text-lg font-semibold mb-1">Configure Custom Shelf</h3>
                <p class="text-xs text-gray-500 mb-3">Select lessons to display in "{{ configuringShelf?.label }}"</p>
                <input [(ngModel)]="customShelfSearch" (input)="filterCustomShelfLessons()" placeholder="Search lessons..." class="form-input mb-3" />
                <!-- Selected lessons -->
                <div *ngIf="customShelfSelectedLessons.length > 0" class="mb-3">
                  <p class="text-xs text-gray-400 mb-1">Selected ({{ customShelfSelectedLessons.length }})</p>
                  <div class="flex flex-wrap gap-1">
                    <span *ngFor="let sl of customShelfSelectedLessons; let si = index"
                          class="inline-flex items-center gap-1 bg-cyan-900/40 text-cyan-300 text-xs px-2 py-1 rounded">
                      {{ sl.title }}
                      <button (click)="removeCustomShelfLesson(si)" class="hover:text-red-400">&times;</button>
                    </span>
                  </div>
                </div>
                <!-- Available lessons -->
                <div class="max-h-52 overflow-y-auto space-y-1">
                  <button *ngFor="let l of filteredCustomLessons"
                          (click)="toggleCustomShelfLesson(l)"
                          class="flex items-center gap-3 w-full text-left p-2 rounded transition"
                          [class.bg-cyan-900/20]="isCustomLessonSelected(l.id)"
                          [class.hover:bg-gray-800]="!isCustomLessonSelected(l.id)"
                          style="border: 1px solid transparent;">
                    <div *ngIf="l.thumbnailUrl" class="w-14 h-9 rounded bg-gray-800 overflow-hidden flex-shrink-0">
                      <img [src]="l.thumbnailUrl" class="w-full h-full object-cover" />
                    </div>
                    <div *ngIf="!l.thumbnailUrl" class="w-14 h-9 rounded bg-gray-800 flex items-center justify-center text-gray-600 flex-shrink-0 text-xs">N/A</div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm text-white truncate">{{ l.title }}</div>
                      <div class="text-xs text-gray-500">{{ l.category || '' }}</div>
                    </div>
                    <svg *ngIf="isCustomLessonSelected(l.id)" class="w-4 h-4 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                  </button>
                  <div *ngIf="filteredCustomLessons.length === 0" class="text-gray-500 text-sm text-center py-3">
                    {{ customShelfSearch ? 'No matching lessons.' : 'No lessons published to this hub.' }}
                  </div>
                </div>
                <div class="flex gap-2 mt-4">
                  <button (click)="saveCustomShelfConfig()" class="btn-primary flex-1">Save</button>
                  <button (click)="showCustomShelfConfigModal = false" class="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex-1">Cancel</button>
                </div>
              </div>
            </div>

            <!-- Featured Shelf Config Modal -->
            <div *ngIf="showFeaturedConfigModal" class="modal-backdrop" (click)="showFeaturedConfigModal = false">
              <div class="modal-content max-w-lg" (click)="$event.stopPropagation()">
                <h3 class="text-lg font-semibold mb-4">Configure Featured Lesson</h3>
                <div class="space-y-3">
                  <div>
                    <label class="block text-sm text-gray-400 mb-2">Featured Lesson Source</label>
                    <div class="space-y-2">
                      <label class="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition"
                             [class.bg-cyan-900/20]="featuredConfig.mode === 'auto'"
                             [class.border-cyan-700]="featuredConfig.mode === 'auto'"
                             [class.bg-gray-900]="featuredConfig.mode !== 'auto'"
                             [class.border-gray-800]="featuredConfig.mode !== 'auto'"
                             style="border: 1px solid;">
                        <input type="radio" name="featuredMode" value="auto" [(ngModel)]="featuredConfig.mode"
                               class="accent-cyan-500 mt-1" />
                        <div>
                          <div class="text-sm text-white font-medium">Most Popular in User's Learning Areas</div>
                          <div class="text-xs text-gray-500 mt-0.5">Automatically shows the top-rated lesson matching the logged-in user's learning interests.</div>
                        </div>
                      </label>
                      <label class="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition"
                             [class.bg-cyan-900/20]="featuredConfig.mode === 'specific'"
                             [class.border-cyan-700]="featuredConfig.mode === 'specific'"
                             [class.bg-gray-900]="featuredConfig.mode !== 'specific'"
                             [class.border-gray-800]="featuredConfig.mode !== 'specific'"
                             style="border: 1px solid;">
                        <input type="radio" name="featuredMode" value="specific" [(ngModel)]="featuredConfig.mode"
                               class="accent-cyan-500 mt-1" />
                        <div>
                          <div class="text-sm text-white font-medium">Specific Lesson</div>
                          <div class="text-xs text-gray-500 mt-0.5">Choose a specific lesson published to this hub.</div>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div *ngIf="featuredConfig.mode === 'specific'" class="mt-3">
                    <label class="block text-sm text-gray-400 mb-1">Select Lesson</label>
                    <input [(ngModel)]="featuredLessonSearch" (input)="filterFeaturedLessons()" placeholder="Search lessons..." class="form-input mb-2" />
                    <div class="max-h-52 overflow-y-auto space-y-1">
                      <button *ngFor="let l of filteredFeaturedLessons"
                              (click)="featuredConfig.lessonId = l.id; featuredConfig.lessonTitle = l.title"
                              class="flex items-center gap-3 w-full text-left p-2 rounded transition"
                              [class.bg-cyan-900/30]="featuredConfig.lessonId === l.id"
                              [class.border-cyan-700]="featuredConfig.lessonId === l.id"
                              [class.hover:bg-gray-800]="featuredConfig.lessonId !== l.id"
                              style="border: 1px solid transparent;">
                        <div *ngIf="l.thumbnailUrl" class="w-14 h-9 rounded bg-gray-800 overflow-hidden flex-shrink-0">
                          <img [src]="l.thumbnailUrl" class="w-full h-full object-cover" />
                        </div>
                        <div *ngIf="!l.thumbnailUrl" class="w-14 h-9 rounded bg-gray-800 flex items-center justify-center text-gray-600 flex-shrink-0 text-xs">N/A</div>
                        <div class="min-w-0">
                          <div class="text-sm text-white truncate">{{ l.title }}</div>
                          <div class="text-xs text-gray-500">{{ l.category || '' }}</div>
                        </div>
                        <svg *ngIf="featuredConfig.lessonId === l.id" class="w-4 h-4 text-cyan-400 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                      </button>
                      <div *ngIf="filteredFeaturedLessons.length === 0" class="text-gray-500 text-sm text-center py-3">
                        {{ featuredLessonSearch ? 'No matching lessons.' : 'No lessons published to this hub yet.' }}
                      </div>
                    </div>
                    <div *ngIf="featuredConfig.lessonTitle" class="mt-2 text-xs text-cyan-400">
                      Selected: {{ featuredConfig.lessonTitle }}
                    </div>
                  </div>
                </div>
                <div class="flex gap-2 mt-4">
                  <button (click)="saveFeaturedConfig()" class="btn-primary flex-1">Save</button>
                  <button (click)="showFeaturedConfigModal = false" class="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex-1">Cancel</button>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ SETTINGS TAB ═══ -->
          <div *ngIf="activeTab === 'settings'" class="max-w-lg space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Hub Name</label>
              <input [(ngModel)]="settingsForm.name" class="form-input" />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Description</label>
              <textarea [(ngModel)]="settingsForm.description" class="form-input" rows="3"></textarea>
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Logo URL</label>
              <input [(ngModel)]="settingsForm.logoUrl" class="form-input" placeholder="https://example.com/logo.png" />
              <p class="text-xs text-gray-600 mt-1">Replaces the Upora logo in the nav bar when viewing this hub.</p>
            </div>
            <div class="flex items-center gap-3">
              <input type="checkbox" [(ngModel)]="settingsForm.isPublic" id="settingsPublic" class="accent-cyan-500 w-4 h-4" />
              <label for="settingsPublic" class="text-sm text-gray-300">Publicly browsable</label>
            </div>

            <!-- Embed code for embedded_blob -->
            <div *ngIf="hub.type === 'embedded_blob'" class="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h4 class="text-sm text-gray-400 mb-2">Embed Code</h4>
              <code class="block bg-black p-3 rounded text-xs text-cyan-300 font-mono">
                &lt;script src="https://upora.app/embed.js"&gt;&lt;/script&gt;
                &lt;upora-hub hub="{{ hub.slug }}"&gt;&lt;/upora-hub&gt;
              </code>
            </div>

            <div *ngIf="settingsError" class="text-red-400 text-sm">{{ settingsError }}</div>

            <button (click)="saveSettings()" [disabled]="savingSettings" class="btn-primary">
              {{ savingSettings ? 'Saving...' : 'Save Settings' }}
            </button>

            <!-- ═══ SSO / Authentication Configuration ═══ -->
            <div class="sso-config-section">
              <h3 class="text-lg font-semibold text-white mb-1 mt-6 flex items-center gap-2">
                <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                Authentication
              </h3>
              <p class="text-xs text-gray-500 mb-4">Configure how users authenticate to access this hub.</p>

              <div class="space-y-3">
                <!-- Provider Selection -->
                <div class="flex gap-3">
                  <label class="sso-option-card" [class.selected]="ssoForm.provider === 'upora'" (click)="ssoForm.provider = 'upora'">
                    <input type="radio" [checked]="ssoForm.provider === 'upora'" name="ssoProvider" class="hidden" />
                    <div class="sso-option-icon" style="background: rgba(239,68,68,0.12); color: #e74c3c;">U</div>
                    <div>
                      <div class="text-sm font-medium text-white">Upora Auth</div>
                      <div class="text-xs text-gray-500">Default Cognito login</div>
                    </div>
                  </label>
                  <label class="sso-option-card" [class.selected]="ssoForm.provider === 'oidc'" (click)="ssoForm.provider = 'oidc'">
                    <input type="radio" [checked]="ssoForm.provider === 'oidc'" name="ssoProvider" class="hidden" />
                    <div class="sso-option-icon" style="background: rgba(0,212,255,0.12); color: #00d4ff;">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                      </svg>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-white">External SSO (OIDC)</div>
                      <div class="text-xs text-gray-500">Okta, Azure AD, Google, etc.</div>
                    </div>
                  </label>
                </div>

                <!-- OIDC Config Fields -->
                <div *ngIf="ssoForm.provider === 'oidc'" class="sso-oidc-fields">
                  <div class="sso-notice">
                    <svg class="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p class="text-xs text-yellow-300/80">When SSO is enabled, existing Upora users cannot join this hub. Only users who authenticate through your SSO provider will have access. New accounts are created automatically on first login.</p>
                  </div>

                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Issuer URL *</label>
                    <input [(ngModel)]="ssoForm.oidcIssuerUrl" placeholder="https://your-company.okta.com" class="form-input" />
                    <p class="text-xs text-gray-600 mt-1">The OIDC discovery endpoint (e.g. https://accounts.google.com)</p>
                  </div>
                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Client ID *</label>
                    <input [(ngModel)]="ssoForm.oidcClientId" placeholder="your-client-id" class="form-input" />
                  </div>
                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Client Secret</label>
                    <input [(ngModel)]="ssoForm.oidcClientSecret" type="password" placeholder="your-client-secret" class="form-input" />
                    <p class="text-xs text-gray-600 mt-1">Required for confidential clients. Leave blank for public clients (PKCE).</p>
                  </div>
                  <details class="text-sm">
                    <summary class="text-gray-500 cursor-pointer hover:text-gray-300 transition">Advanced claim mapping</summary>
                    <div class="mt-2 space-y-2 pl-2 border-l border-gray-800">
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Email claim</label>
                        <input [(ngModel)]="ssoForm.emailClaim" placeholder="email" class="form-input text-sm" />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Name claim</label>
                        <input [(ngModel)]="ssoForm.nameClaim" placeholder="name" class="form-input text-sm" />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Scopes</label>
                        <input [(ngModel)]="ssoForm.scopes" placeholder="openid email profile" class="form-input text-sm" />
                      </div>
                    </div>
                  </details>
                </div>

                <div *ngIf="ssoError" class="text-red-400 text-sm bg-red-900/20 p-2 rounded">{{ ssoError }}</div>
                <div *ngIf="ssoSuccess" class="text-green-400 text-sm bg-green-900/20 p-2 rounded">{{ ssoSuccess }}</div>

                <button (click)="saveSsoConfig()" [disabled]="savingSso" class="btn-primary">
                  {{ savingSso ? 'Saving...' : 'Save Authentication Settings' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #000; }
    :host ::ng-deep ion-content { --background: #000; --color: #fff; }

    .stat-card {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 1.25rem; text-align: center;
    }
    .stat-number { font-size: 1.5rem; font-weight: 700; color: #00d4ff; }
    .stat-label { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-top: 0.25rem; }

    .form-input {
      width: 100%; padding: 0.6rem 0.8rem;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px; color: #fff; font-size: 0.9rem;
    }
    .form-input::placeholder { color: rgba(255,255,255,0.3); }
    .form-input:focus { outline: none; border-color: rgba(0,212,255,0.5); }

    .form-select {
      width: 100%; padding: 0.6rem 0.8rem;
      background: #1a1a2e; border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px; color: #fff; font-size: 0.9rem;
      appearance: auto;
    }
    .form-select:focus { outline: none; border-color: rgba(0,212,255,0.5); }
    .form-select option { background: #1a1a2e; color: #fff; }

    .btn-primary {
      padding: 0.5rem 1rem; background: #00d4ff; color: #000; border: none;
      border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.85rem;
      white-space: nowrap;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      padding: 0.5rem 1rem; background: rgba(255,255,255,0.1); color: #fff; border: none;
      border-radius: 6px; cursor: pointer; font-size: 0.85rem;
    }
    .btn-sm {
      padding: 0.3rem 0.6rem; background: rgba(0,212,255,0.15); color: #00d4ff;
      border: 1px solid rgba(0,212,255,0.3); border-radius: 6px; cursor: pointer;
      font-size: 0.8rem;
    }

    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .modal-card {
      background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 1.5rem; width: 450px; max-width: 95vw;
    }
    .modal-wide { width: 650px; max-height: 80vh; overflow-y: auto; }

    .available-list { max-height: 40vh; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
    .available-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.6rem 0.75rem; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;
    }

    /* Shelf management */
    .shelf-row-item {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      transition: all 0.15s;
    }
    .shelf-row-item:hover { border-color: rgba(255,255,255,0.12); }
    .cdk-drag-preview {
      background: #1a1a1a;
      border: 1px solid rgba(0,212,255,0.4);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    .cdk-drag-placeholder {
      opacity: 0.3;
    }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .cdk-drop-list-dragging .shelf-row-item:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .shelf-type-badge {
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255,255,255,0.06);
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .shelf-type-badge[data-type="continue_learning"],
    .shelf-type-badge[data-type="recommended"] {
      background: rgba(168,85,247,0.12);
      color: #a855f7;
    }
    .shelf-type-badge[data-type="courses"] {
      background: rgba(0,212,255,0.12);
      color: #00d4ff;
    }
    .shelf-type-badge[data-type="featured"] {
      background: rgba(251,191,36,0.12);
      color: #fbbf24;
    }
    .shelf-type-badge[data-type="custom"] {
      background: rgba(34,197,94,0.12);
      color: #22c55e;
    }

    /* Toggle switch */
    .shelf-toggle { position: relative; display: inline-block; cursor: pointer; }
    .shelf-toggle input { display: none; }
    .shelf-toggle-track {
      display: block; width: 36px; height: 20px;
      background: #333; border-radius: 10px; transition: background 0.2s;
    }
    .shelf-toggle input:checked + .shelf-toggle-track { background: #0891b2; }
    .shelf-toggle-thumb {
      position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px;
      background: #fff; border-radius: 50%; transition: left 0.2s;
    }
    .shelf-toggle input:checked ~ .shelf-toggle-track .shelf-toggle-thumb { left: 18px; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 300;
      background: rgba(0,0,0,0.7); display: flex;
      align-items: center; justify-content: center;
    }
    .modal-content {
      background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px; padding: 1.5rem; width: 90%; max-width: 420px;
    }

    /* SSO Config */
    .sso-config-section { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 1rem; }
    .sso-option-card {
      display: flex; align-items: center; gap: 0.75rem;
      flex: 1; padding: 0.75rem; cursor: pointer;
      background: rgba(255,255,255,0.02); border: 2px solid rgba(255,255,255,0.08);
      border-radius: 10px; transition: all 0.2s;
    }
    .sso-option-card:hover { border-color: rgba(255,255,255,0.15); }
    .sso-option-card.selected { border-color: #00d4ff; background: rgba(0,212,255,0.05); }
    .sso-option-icon {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 8px; font-weight: 700; flex-shrink: 0;
    }
    .sso-oidc-fields { display: flex; flex-direction: column; gap: 0.75rem; }
    .sso-notice {
      display: flex; gap: 0.5rem; padding: 0.75rem;
      background: rgba(251,191,36,0.06); border: 1px solid rgba(251,191,36,0.15);
      border-radius: 8px;
    }
  `]
})
export class HubManageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  slug = '';
  hub: HubDetail | null = null;
  loading = true;

  tabs: { id: ManageTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Members' },
    { id: 'content', label: 'Content' },
    { id: 'shelves', label: 'Shelves' },
    { id: 'settings', label: 'Settings' },
  ];
  activeTab: ManageTab = 'overview';

  // Shelves
  shelves: any[] = [];
  shelvesLoading = false;
  shelvesSaving = false;
  shelvesError = '';
  shelvesSuccess = '';
  showAddShelfModal = false;
  newShelfType = 'category';
  newShelfLabel = '';
  newShelfCategory = '';
  availableCategories: string[] = [];
  editingShelfId: string | null = null;

  // Shelf label autocomplete (learning areas)
  newShelfLabelInput = '';
  newShelfLabels: string[] = [];
  allLearningAreas: string[] = [];
  shelfLabelSuggestions: string[] = [];

  // New shelf name
  newShelfName = '';

  // Featured shelf config
  showFeaturedConfigModal = false;
  featuredConfig = { mode: 'auto' as 'auto' | 'specific', lessonId: '', lessonTitle: '' };
  featuredLessons: any[] = [];
  filteredFeaturedLessons: any[] = [];
  featuredLessonSearch = '';
  configuringShelf: any = null;

  // Custom shelf config
  showCustomShelfConfigModal = false;
  customShelfLessons: any[] = [];
  filteredCustomLessons: any[] = [];
  customShelfSelectedLessons: { id: string; title: string }[] = [];
  customShelfSearch = '';

  // Members
  members: HubMember[] = [];
  memberSearch = '';
  loadingMembers = false;
  showInvite = false;
  inviteEmails = '';
  inviteSending = false;
  inviteResult: { invited: number; alreadyMember: number; errors: string[] } | null = null;

  // Content
  hubLessons: HubContentItem[] = [];
  hubCourses: HubCourseItem[] = [];
  loadingContent = false;
  showAddContent = false;
  allAvailable: any[] = [];
  filteredAvailable: any[] = [];
  loadingAvailable = false;
  contentSearch = '';
  addingId: string | null = null;

  // Settings
  settingsForm = { name: '', description: '', isPublic: false, logoUrl: '' };
  savingSettings = false;
  settingsError = '';

  // SSO Config
  ssoForm = {
    provider: 'upora' as 'upora' | 'oidc',
    oidcIssuerUrl: '',
    oidcClientId: '',
    oidcClientSecret: '',
    emailClaim: 'email',
    nameClaim: 'name',
    scopes: 'openid email profile',
  };
  savingSso = false;
  ssoError = '';
  ssoSuccess = '';

  get isAdmin(): boolean {
    return this.hub?.myRole === 'owner' || this.hub?.myRole === 'admin';
  }

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private hubsService: HubsService,
    private coursesService: CoursesService,
    private api: ApiService,
    private onboardingService: OnboardingService,
  ) {}

  ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    if (this.slug) this.loadHub();
    this.loadLearningAreas();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadHub() {
    this.loading = true;
    this.hubsService.getHub(this.slug).pipe(takeUntil(this.destroy$)).subscribe({
      next: (hub) => {
        this.hub = hub;
        this.settingsForm = {
          name: hub.name,
          description: hub.description || '',
          isPublic: hub.isPublic,
          logoUrl: hub.logoUrl || '',
        };
        this.loading = false;
        this.loadTabData();
      },
      error: () => { this.loading = false; },
    });
  }

  loadTabData() {
    if (!this.hub) return;
    switch (this.activeTab) {
      case 'members': this.loadMembers(); break;
      case 'content': this.loadContent(); break;
      case 'shelves': this.loadShelves(); break;
      case 'settings': this.loadSsoConfig(); break;
    }
  }

  // ─── Members ───

  loadMembers() {
    if (!this.hub) return;
    this.loadingMembers = true;
    this.hubsService.getMembers(this.hub.id, this.memberSearch.trim() || undefined).pipe(takeUntil(this.destroy$)).subscribe({
      next: (m) => { this.members = m; this.loadingMembers = false; },
      error: () => { this.loadingMembers = false; },
    });
  }

  searchMembers() {
    setTimeout(() => this.loadMembers(), 300);
  }

  sendInvites() {
    if (!this.hub) return;
    const emails = this.inviteEmails.split(/[,\n]/).map(e => e.trim()).filter(e => e);
    if (emails.length === 0) return;
    this.inviteSending = true;
    this.hubsService.inviteMembers(this.hub.id, emails).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.inviteResult = result;
        this.inviteEmails = '';
        this.inviteSending = false;
        this.loadMembers();
        this.loadHub(); // refresh counts
      },
      error: (err) => {
        this.inviteSending = false;
        alert(err?.error?.message || 'Failed to send invitations');
      },
    });
  }

  changeRole(member: HubMember, newRole: string) {
    if (!this.hub) return;
    this.hubsService.changeMemberRole(this.hub.id, member.id, newRole).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadMembers(),
      error: (err) => alert(err?.error?.message || 'Failed to change role'),
    });
  }

  removeMemberConfirm(member: HubMember) {
    if (!this.hub || !confirm(`Remove ${member.name} from this hub?`)) return;
    this.hubsService.removeMember(this.hub.id, member.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.loadMembers(); this.loadHub(); },
      error: (err) => alert(err?.error?.message || 'Failed to remove member'),
    });
  }

  // ─── Content ───

  loadContent() {
    if (!this.hub) return;
    this.loadingContent = true;
    this.hubsService.getHubContent(this.hub.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.hubLessons = data.lessons;
        this.hubCourses = data.courses;
        this.loadingContent = false;
      },
      error: () => { this.loadingContent = false; },
    });
  }

  openAddContent() {
    this.showAddContent = true;
    this.contentSearch = '';
    this.loadAvailableContent();
  }

  async loadAvailableContent() {
    if (!this.hub) return;
    this.loadingAvailable = true;
    try {
      // Get user's lessons and courses
      const [lessons, courses] = await Promise.all([
        this.api.get<any[]>('/lessons', { createdBy: 'me' }).toPromise() || [],
        this.coursesService.getCourses().toPromise() || [],
      ]);

      const existingLessonIds = new Set(this.hubLessons.map(l => l.id));
      const existingCourseIds = new Set(this.hubCourses.map(c => c.id));

      const available: any[] = [];
      for (const l of (lessons || [])) {
        if (!existingLessonIds.has(l.id)) {
          available.push({ ...l, itemType: 'lesson' });
        }
      }
      for (const c of (courses || [])) {
        if (!existingCourseIds.has(c.id)) {
          available.push({ ...c, itemType: 'course' });
        }
      }

      this.allAvailable = available;
      this.filterContent();
    } catch (err) {
      console.error('[HubManage] Failed to load available content:', err);
    } finally {
      this.loadingAvailable = false;
    }
  }

  filterContent() {
    const term = this.contentSearch.trim().toLowerCase();
    if (!term) {
      this.filteredAvailable = [...this.allAvailable];
    } else {
      this.filteredAvailable = this.allAvailable.filter(
        i => i.title?.toLowerCase().includes(term),
      );
    }
  }

  addContent(item: any) {
    if (!this.hub) return;
    this.addingId = item.id;
    const data = item.itemType === 'course'
      ? { courseId: item.id }
      : { lessonId: item.id };

    this.hubsService.linkContent(this.hub.id, data.lessonId, data.courseId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.allAvailable = this.allAvailable.filter(i => i.id !== item.id);
        this.filterContent();
        this.loadContent();
        this.addingId = null;
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to add content');
        this.addingId = null;
      },
    });
  }

  unlinkContent(linkId: string) {
    if (!this.hub || !confirm('Remove this content from the hub?')) return;
    this.hubsService.unlinkContent(this.hub.id, linkId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadContent(),
      error: (err) => alert(err?.error?.message || 'Failed to remove content'),
    });
  }

  // ─── Settings ───

  saveSettings() {
    if (!this.hub) return;
    this.savingSettings = true;
    this.settingsError = '';
    this.hubsService.updateHub(this.hub.id, this.settingsForm).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingSettings = false;
        this.loadHub();
      },
      error: (err) => {
        this.savingSettings = false;
        this.settingsError = err?.error?.message || 'Failed to save';
      },
    });
  }

  // ─── Shelves ───

  loadShelves() {
    if (!this.hub) return;
    this.shelvesLoading = true;
    this.api.get<any>(`/hubs/${this.hub.id}/shelf-config`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (config) => {
        this.shelves = (config?.shelves || []).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
        this.shelvesLoading = false;
      },
      error: () => {
        this.shelves = [];
        this.shelvesLoading = false;
      },
    });
  }

  onShelfDrop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.shelves, event.previousIndex, event.currentIndex);
    this.shelves.forEach((s, i) => s.sortOrder = i);
  }

  saveShelves() {
    if (!this.hub) return;
    this.shelvesSaving = true;
    this.shelvesError = '';
    this.shelvesSuccess = '';
    this.shelves.forEach((s, i) => s.sortOrder = i);

    this.api.patch(`/hubs/${this.hub.id}/shelf-config`, { shelves: this.shelves }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.shelvesSaving = false;
        this.shelvesSuccess = 'Shelves saved successfully.';
        setTimeout(() => this.shelvesSuccess = '', 4000);
      },
      error: (err) => {
        this.shelvesSaving = false;
        this.shelvesError = err?.error?.message || 'Failed to save shelves.';
      },
    });
  }

  onShelfTypeChange() {
    // Auto-fill name for auto-types if empty
    if (!this.newShelfName.trim()) {
      const autoNames: Record<string, string> = {
        continue_learning: 'Continue Learning',
        recommended: 'Recommended',
        featured: 'Featured',
      };
      if (autoNames[this.newShelfType]) {
        this.newShelfName = autoNames[this.newShelfType];
      }
    }
  }

  addShelf() {
    const labels = this.newShelfLabels.length > 0
      ? [...this.newShelfLabels]
      : (this.newShelfLabelInput.trim() ? [this.newShelfLabelInput.trim()] : []);
    const name = this.newShelfName.trim() || (labels.length > 0 ? labels.join(', ') : this.getShelfTypeBadge(this.newShelfType));

    const id = this.newShelfType + '-' + Date.now();
    const shelf: any = {
      id,
      type: this.newShelfType,
      label: name,
      enabled: true,
      sortOrder: this.shelves.length,
    };
    if (this.newShelfType === 'category') {
      shelf.config = { category: labels.join(', ') || name };
    }
    if (this.newShelfType === 'courses') {
      shelf.config = {};
    }
    if (this.newShelfType === 'custom') {
      shelf.config = { lessonIds: [], lessonTitles: [] };
    }
    this.shelves.push(shelf);
    this.showAddShelfModal = false;
    this.newShelfName = '';
    this.newShelfLabels = [];
    this.newShelfLabelInput = '';
    this.newShelfCategory = '';
    this.newShelfType = 'category';
  }

  removeShelf(index: number) {
    this.shelves.splice(index, 1);
    this.shelves.forEach((s, i) => s.sortOrder = i);
  }

  getShelfTypeBadge(type: string): string {
    const badges: Record<string, string> = {
      featured: 'Featured',
      continue_learning: 'Auto: Continue Learning',
      recommended: 'Auto: Recommended',
      courses: 'Courses',
      category: 'Category',
      custom: 'Custom',
    };
    return badges[type] || type;
  }

  previewHub() {
    if (!this.hub) return;
    window.open(`/hubs/${this.hub.slug}?preview=true`, '_blank');
  }

  // ─── SSO Config ───

  loadSsoConfig() {
    if (!this.hub) return;
    this.api.get<any>(`/hubs/${this.hub.id}/auth-config`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (config) => {
        this.ssoForm = {
          provider: config?.provider || 'upora',
          oidcIssuerUrl: config?.oidcIssuerUrl || '',
          oidcClientId: config?.oidcClientId || '',
          oidcClientSecret: '', // Never pre-fill secret (it's masked)
          emailClaim: config?.emailClaim || 'email',
          nameClaim: config?.nameClaim || 'name',
          scopes: config?.scopes || 'openid email profile',
        };
      },
      error: () => {},
    });
  }

  saveSsoConfig() {
    if (!this.hub) return;
    this.savingSso = true;
    this.ssoError = '';
    this.ssoSuccess = '';

    // Validate required fields for OIDC
    if (this.ssoForm.provider === 'oidc') {
      if (!this.ssoForm.oidcIssuerUrl?.trim() || !this.ssoForm.oidcClientId?.trim()) {
        this.ssoError = 'Issuer URL and Client ID are required for OIDC.';
        this.savingSso = false;
        return;
      }
    }

    const payload: any = { ...this.ssoForm };
    // Don't send empty secret (keep existing)
    if (!payload.oidcClientSecret) {
      delete payload.oidcClientSecret;
    }

    this.api.patch(`/hubs/${this.hub.id}/auth-config`, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingSso = false;
        this.ssoSuccess = 'Authentication settings saved successfully.';
        this.loadHub(); // Refresh hub data
        setTimeout(() => this.ssoSuccess = '', 5000);
      },
      error: (err) => {
        this.savingSso = false;
        this.ssoError = err?.error?.message || 'Failed to save SSO configuration.';
      },
    });
  }

  // ─── Learning Areas ───

  loadLearningAreas() {
    this.onboardingService.getOptions('learning_areas')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (opts) => {
          this.allLearningAreas = opts.map((o: any) => o.label || o.id || o);
        },
        error: () => {},
      });
  }

  onShelfLabelInput(event: any) {
    const val = (this.newShelfLabelInput || '').trim().toLowerCase();
    if (!val) {
      this.shelfLabelSuggestions = [];
      return;
    }
    this.shelfLabelSuggestions = this.allLearningAreas.filter(
      a => a.toLowerCase().includes(val) && !this.newShelfLabels.includes(a),
    ).slice(0, 8);
  }

  pickLabelSuggestion(label: string) {
    if (!this.newShelfLabels.includes(label)) {
      this.newShelfLabels.push(label);
    }
    this.newShelfLabelInput = '';
    this.shelfLabelSuggestions = [];
  }

  confirmLabelSuggestion(event: Event) {
    event.preventDefault();
    if (this.shelfLabelSuggestions.length > 0) {
      this.pickLabelSuggestion(this.shelfLabelSuggestions[0]);
    } else if (this.newShelfLabelInput.trim()) {
      // Allow free-text as fallback
      this.newShelfLabels.push(this.newShelfLabelInput.trim());
      this.newShelfLabelInput = '';
    }
  }

  // ─── Featured Shelf Config ───

  openShelfConfig(shelf: any) {
    this.configuringShelf = shelf;
    if (shelf.type === 'featured') {
      this.featuredConfig = {
        mode: shelf.config?.mode || 'auto',
        lessonId: shelf.config?.lessonId || '',
        lessonTitle: shelf.config?.lessonTitle || '',
      };
      this.featuredLessonSearch = '';
      this.loadFeaturedLessons();
      this.showFeaturedConfigModal = true;
    } else if (shelf.type === 'custom') {
      this.customShelfSearch = '';
      this.customShelfSelectedLessons = (shelf.config?.lessonIds || []).map((id: string, i: number) => ({
        id,
        title: shelf.config?.lessonTitles?.[i] || id,
      }));
      this.loadCustomShelfLessons();
      this.showCustomShelfConfigModal = true;
    } else {
      // For category/courses, toggle inline editing
      this.editingShelfId = this.editingShelfId === shelf.id ? null : shelf.id;
    }
  }

  loadFeaturedLessons() {
    // Load ALL approved lessons so any can be featured
    this.api.get<any[]>('/lessons', { status: 'approved' }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (lessons) => {
        this.featuredLessons = (lessons || []).map(l => ({
          id: l.id, title: l.title, category: l.category, thumbnailUrl: l.thumbnailUrl || l.thumbnail_url,
        }));
        this.filterFeaturedLessons();
      },
      error: () => { this.featuredLessons = []; this.filteredFeaturedLessons = []; },
    });
  }

  filterFeaturedLessons() {
    const term = this.featuredLessonSearch.trim().toLowerCase();
    if (!term) {
      this.filteredFeaturedLessons = [...this.featuredLessons];
      return;
    }
    // Score each lesson: exact includes > starts-with word > partial word overlap
    const scored = this.featuredLessons.map((l: any) => {
      const title = (l.title || '').toLowerCase();
      const cat = (l.category || '').toLowerCase();
      let score = 0;
      if (title.includes(term) || cat.includes(term)) score += 100;
      const words = term.split(/\s+/);
      words.forEach(w => {
        if (title.includes(w)) score += 50;
        if (cat.includes(w)) score += 25;
      });
      // Partial character overlap bonus
      for (const ch of term) { if (title.includes(ch)) score += 1; }
      return { lesson: l, score };
    });
    scored.sort((a, b) => b.score - a.score);
    // Always show at least 3 closest matches
    const exact = scored.filter(s => s.score >= 100);
    this.filteredFeaturedLessons = exact.length >= 3
      ? exact.map(s => s.lesson)
      : scored.slice(0, Math.max(3, exact.length)).map(s => s.lesson);
  }

  saveFeaturedConfig() {
    if (!this.configuringShelf) return;
    this.configuringShelf.config = { ...this.featuredConfig };
    this.showFeaturedConfigModal = false;
  }

  // ─── Custom Shelf Config ───

  loadCustomShelfLessons() {
    // Load ALL approved lessons for custom shelf picker
    this.api.get<any[]>('/lessons', { status: 'approved' }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (lessons) => {
        this.customShelfLessons = (lessons || []).map(l => ({
          id: l.id, title: l.title, category: l.category, thumbnailUrl: l.thumbnailUrl || l.thumbnail_url,
        }));
        this.filterCustomShelfLessons();
      },
      error: () => { this.customShelfLessons = []; this.filteredCustomLessons = []; },
    });
  }

  filterCustomShelfLessons() {
    const term = this.customShelfSearch.trim().toLowerCase();
    if (!term) {
      this.filteredCustomLessons = [...this.customShelfLessons];
      return;
    }
    const scored = this.customShelfLessons.map((l: any) => {
      const title = (l.title || '').toLowerCase();
      const cat = (l.category || '').toLowerCase();
      let score = 0;
      if (title.includes(term) || cat.includes(term)) score += 100;
      const words = term.split(/\s+/);
      words.forEach(w => {
        if (title.includes(w)) score += 50;
        if (cat.includes(w)) score += 25;
      });
      for (const ch of term) { if (title.includes(ch)) score += 1; }
      return { lesson: l, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const exact = scored.filter(s => s.score >= 100);
    this.filteredCustomLessons = exact.length >= 3
      ? exact.map(s => s.lesson)
      : scored.slice(0, Math.max(3, exact.length)).map(s => s.lesson);
  }

  isCustomLessonSelected(id: string): boolean {
    return this.customShelfSelectedLessons.some(l => l.id === id);
  }

  toggleCustomShelfLesson(lesson: any) {
    const idx = this.customShelfSelectedLessons.findIndex(l => l.id === lesson.id);
    if (idx >= 0) {
      this.customShelfSelectedLessons.splice(idx, 1);
    } else {
      this.customShelfSelectedLessons.push({ id: lesson.id, title: lesson.title });
    }
  }

  removeCustomShelfLesson(index: number) {
    this.customShelfSelectedLessons.splice(index, 1);
  }

  saveCustomShelfConfig() {
    if (!this.configuringShelf) return;
    this.configuringShelf.config = {
      lessonIds: this.customShelfSelectedLessons.map(l => l.id),
      lessonTitles: this.customShelfSelectedLessons.map(l => l.title),
    };
    this.showCustomShelfConfigModal = false;
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}

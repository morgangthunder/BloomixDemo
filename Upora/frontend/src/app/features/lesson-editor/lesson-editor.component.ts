import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LessonService } from '../../core/services/lesson.service';
import { ContentSearchWidgetComponent } from '../../shared/components/content-search-widget/content-search-widget.component';
import { Lesson } from '../../core/models/lesson.model';

@Component({
  selector: 'app-lesson-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ContentSearchWidgetComponent],
  template: `
    <div class="lesson-editor bg-brand-dark min-h-screen text-white">
      <!-- Header -->
      <header class="bg-brand-black border-b border-gray-700 p-4 md:p-6">
        <div class="container mx-auto flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button (click)="goBack()" class="text-white hover:text-brand-red transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold">{{isNewLesson ? 'Create New Lesson' : 'Edit Lesson'}}</h1>
              <p class="text-sm text-gray-400" *ngIf="lesson">{{lesson.status}} • {{lesson.category}}</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <button 
              (click)="saveDraft()"
              class="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded transition">
              💾 Save Draft
            </button>
            <button 
              (click)="submitForApproval()"
              [disabled]="!canSubmit()"
              class="bg-brand-red hover:bg-opacity-80 text-white font-semibold py-2 px-6 rounded transition disabled:opacity-50">
              ✓ Submit for Approval
            </button>
          </div>
        </div>
      </header>

      <!-- Main Editor -->
      <div class="container mx-auto px-4 md:px-6 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Left Column: Lesson Details -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Basic Info -->
            <div class="card">
              <h3 class="card-title">Basic Information</h3>
              
              <div class="form-group">
                <label>Lesson Title *</label>
                <input 
                  type="text" 
                  [(ngModel)]="lesson.title"
                  placeholder="e.g., JavaScript Fundamentals"
                  class="form-control">
              </div>

              <div class="form-group">
                <label>Description *</label>
                <textarea 
                  [(ngModel)]="lesson.description"
                  rows="3"
                  placeholder="Brief description of what students will learn..."
                  class="form-control">
                </textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="form-group">
                  <label>Category *</label>
                  <select [(ngModel)]="lesson.category" class="form-control">
                    <option value="">Select category</option>
                    <option value="Programming">Programming</option>
                    <option value="Web Development">Web Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Difficulty *</label>
                  <select [(ngModel)]="lesson.difficulty" class="form-control">
                    <option value="">Select difficulty</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Duration (minutes)</label>
                <input 
                  type="number" 
                  [(ngModel)]="lesson.durationMinutes"
                  placeholder="60"
                  class="form-control">
              </div>

              <div class="form-group">
                <label>Tags (comma separated)</label>
                <input 
                  type="text" 
                  [(ngModel)]="tagsInput"
                  placeholder="javascript, programming, web-development"
                  class="form-control">
              </div>

              <div class="form-group">
                <label>Thumbnail URL</label>
                <input 
                  type="url" 
                  [(ngModel)]="lesson.thumbnailUrl"
                  placeholder="https://images.unsplash.com/..."
                  class="form-control">
                <small class="text-gray-400">Or leave blank to generate with AI (Phase 5)</small>
              </div>
            </div>

            <!-- Lesson Content (Stages) -->
            <div class="card">
              <h3 class="card-title">Lesson Content</h3>
              <p class="text-gray-400 text-sm mb-4">
                This lesson has {{lesson.data?.stages?.length || 0}} stages.
              </p>
              <div class="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-4">
                <p class="text-yellow-200 text-sm">
                  ℹ️ Full stage editor coming in Phase 5. For now, stages are managed via JSON.
                </p>
              </div>
              <div class="form-group">
                <label>Lesson JSON Data</label>
                <textarea 
                  [(ngModel)]="lessonDataJson"
                  rows="10"
                  class="form-control font-mono text-sm"
                  placeholder='{"stages": []}'>
                </textarea>
              </div>
            </div>
          </div>

          <!-- Right Column: Content Library & Settings -->
          <div class="space-y-6">
            <!-- Content Search Widget -->
            <div class="card">
              <app-content-search-widget
                [lessonId]="lesson.id"
                (contentLinked)="onContentLinked($event)"
                (contentUnlinked)="onContentUnlinked($event)">
              </app-content-search-widget>
            </div>

            <!-- Preview -->
            <div class="card">
              <h3 class="card-title">Quick Info</h3>
              <div class="space-y-3 text-sm">
                <div>
                  <label class="text-gray-400">Status:</label>
                  <span class="ml-2 font-semibold" 
                        [class.text-green-400]="lesson.status === 'approved'"
                        [class.text-yellow-400]="lesson.status === 'pending'"
                        [class.text-red-400]="lesson.status === 'rejected'">
                    {{lesson.status}}
                  </span>
                </div>
                <div *ngIf="lesson.id">
                  <label class="text-gray-400">Lesson ID:</label>
                  <span class="ml-2 text-xs font-mono">{{lesson.id}}</span>
                </div>
                <div *ngIf="lesson.createdAt">
                  <label class="text-gray-400">Created:</label>
                  <span class="ml-2">{{formatDate(lesson.createdAt)}}</span>
                </div>
                <div *ngIf="lesson.updatedAt">
                  <label class="text-gray-400">Last Updated:</label>
                  <span class="ml-2">{{formatDate(lesson.updatedAt)}}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 24px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 600;
      color: white;
      margin-bottom: 16px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      color: #d1d5db;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .form-control {
      width: 100%;
      padding: 12px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: white;
      font-size: 14px;
    }
    .form-control:focus {
      outline: none;
      border-color: #ef4444;
    }
    textarea.form-control {
      resize: vertical;
      font-family: inherit;
    }
    select.form-control {
      cursor: pointer;
    }
  `]
})
export class LessonEditorComponent implements OnInit {
  lesson: any = {
    title: '',
    description: '',
    category: '',
    difficulty: '',
    durationMinutes: 60,
    thumbnailUrl: '',
    status: 'pending',
    data: { stages: [] }
  };
  
  isNewLesson = true;
  lessonId: string | null = null;
  lessonDataJson = '';
  tagsInput = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private lessonService: LessonService
  ) {}

  async ngOnInit() {
    this.lessonId = this.route.snapshot.paramMap.get('id');
    
    if (this.lessonId && this.lessonId !== 'new') {
      // Load existing lesson
      await this.loadLesson(this.lessonId);
      this.isNewLesson = false;
    } else {
      // New lesson
      this.isNewLesson = true;
      this.lessonDataJson = JSON.stringify({ stages: [] }, null, 2);
    }
  }

  async loadLesson(id: string) {
    try {
      // TODO: Load from API
      console.log('[LessonEditor] Loading lesson:', id);
      // For now, use mock structure
      this.lesson = {
        id: id,
        title: 'Lesson Title',
        description: 'Description here',
        category: 'Programming',
        difficulty: 'Beginner',
        status: 'pending',
        data: { stages: [] }
      };
      this.lessonDataJson = JSON.stringify(this.lesson.data, null, 2);
    } catch (error) {
      console.error('Failed to load lesson:', error);
    }
  }

  async saveDraft() {
    try {
      // Parse JSON
      if (this.lessonDataJson) {
        this.lesson.data = JSON.parse(this.lessonDataJson);
      }
      
      // Parse tags
      if (this.tagsInput) {
        this.lesson.tags = this.tagsInput.split(',').map(t => t.trim());
      }

      console.log('[LessonEditor] Saving draft:', this.lesson);
      
      // TODO: POST/PATCH to API
      alert('Draft saved! (Full API integration in next update)');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save lesson. Check JSON syntax.');
    }
  }

  async submitForApproval() {
    if (!this.canSubmit()) return;

    try {
      await this.saveDraft();
      // TODO: POST /api/lessons/:id/submit
      alert('Lesson submitted for approval!');
      this.router.navigate(['/lesson-builder']);
    } catch (error) {
      console.error('Failed to submit:', error);
      alert('Failed to submit lesson');
    }
  }

  canSubmit(): boolean {
    return !!(this.lesson.title && this.lesson.description && this.lesson.category);
  }

  goBack() {
    if (confirm('Discard unsaved changes?')) {
      this.router.navigate(['/lesson-builder']);
    }
  }

  onContentLinked(contentId: string) {
    console.log('[LessonEditor] Content linked:', contentId);
  }

  onContentUnlinked(contentId: string) {
    console.log('[LessonEditor] Content unlinked:', contentId);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}


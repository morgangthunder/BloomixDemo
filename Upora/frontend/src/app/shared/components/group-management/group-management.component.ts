import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import {
  LessonGroupsService,
  LessonGroup,
  GroupMember,
  Assignment,
  AssignmentSubmission,
  UserLessonDeadline,
  GroupProgress,
  AssignmentType,
  LessonVisibility,
} from '../../../core/services/lesson-groups.service';
import { CoursesService } from '../../../core/services/courses.service';
import { MessagesModalComponent } from '../messages-modal/messages-modal.component';

type GroupTab = 'members' | 'assignments' | 'deadlines' | 'progress' | 'visibility';

@Component({
  selector: 'app-group-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MessagesModalComponent],
  template: `
    <div class="group-mgmt">
      <!-- Group Selector -->
      <div class="group-selector">
        <div class="group-tabs-row">
          <div *ngFor="let g of groups" class="group-tab-wrapper">
            <button
              class="group-tab"
              [class.active]="selectedGroup?.id === g.id"
              (click)="selectGroup(g)">
              <span class="group-name">{{ g.name }}</span>
              <span class="group-count">{{ g.memberCount ?? 0 }} members</span>
            </button>
            <button
              *ngIf="!g.isDefault"
              class="group-delete-btn"
              title="Delete group"
              (click)="confirmDeleteGroup(g); $event.stopPropagation()">✕</button>
          </div>
          <button class="group-tab add-group-btn" (click)="showCreateGroup = true" title="Create custom group">+ New Group</button>
        </div>
      </div>

      <!-- Delete Group Confirmation Modal -->
      <div *ngIf="groupToDelete" class="modal-overlay" (click)="groupToDelete = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>Delete Group</h3>
          <p class="delete-warning">Are you sure you want to delete <strong>"{{ groupToDelete.name }}"</strong>?</p>
          <div class="delete-info">
            <span class="warning-icon">⚠️</span>
            <span>{{ groupToDelete.memberCount ?? 0 }} member(s) will be <strong>notified</strong> that this group has been deleted and they have been removed.</span>
          </div>
          <p class="delete-note">This action cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="groupToDelete = null">Cancel</button>
            <button class="btn-danger-action" (click)="executeDeleteGroup()" [disabled]="deletingGroup">
              {{ deletingGroup ? 'Deleting...' : 'Delete & Notify Members' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Create Group Modal -->
      <div *ngIf="showCreateGroup" class="modal-overlay" (click)="showCreateGroup = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>Create Custom Group</h3>
          <input [(ngModel)]="newGroupName" placeholder="Group name..." class="form-input" />
          <textarea [(ngModel)]="newGroupDesc" placeholder="Description (optional)" class="form-input" rows="2"></textarea>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="showCreateGroup = false">Cancel</button>
            <button class="btn-primary" (click)="createGroup()" [disabled]="!newGroupName.trim()">Create</button>
          </div>
        </div>
      </div>

      <!-- Inner Tabs (within selected group) -->
      <div *ngIf="selectedGroup" class="inner-tabs">
        <div class="inner-tab-row">
          <button *ngFor="let t of innerTabs" class="inner-tab" [class.active]="activeTab === t.id" (click)="activeTab = t.id; loadTabData()">
            {{ t.icon }} {{ t.label }}
          </button>
        </div>

        <!-- ═══ MEMBERS TAB ═══ -->
        <div *ngIf="activeTab === 'members'" class="tab-content">
          <div class="tab-header">
            <input [(ngModel)]="memberSearch" (input)="searchMembers()" placeholder="Search members..." class="search-input" />
            <div class="tab-header-actions">
              <button *ngIf="!selectedGroup.isDefault" class="btn-sm" (click)="showInviteMembers = true">Invite Members</button>
              <button *ngIf="!selectedGroup.isDefault" class="btn-sm" (click)="showAddMember = true">+ Add by ID</button>
            </div>
          </div>
          <div *ngIf="loadingMembers" class="loading">Loading members...</div>
          <div *ngIf="!loadingMembers && members.length === 0" class="empty">No members found.</div>
          <div class="member-list">
            <div *ngFor="let m of members" class="member-row" [class.invited]="m.status === 'invited'">
              <div class="member-info">
                <span class="member-name">{{ m.name }}</span>
                <span class="member-email">{{ m.email }}</span>
                <span *ngIf="m.status === 'invited'" class="invite-badge">Invited</span>
              </div>
              <div class="member-actions">
                <button class="btn-icon" title="Send message" (click)="openMessage(m)">💬</button>
                <button *ngIf="!selectedGroup.isDefault" class="btn-icon btn-danger" title="Remove" (click)="removeMember(m)">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Member Modal -->
        <div *ngIf="showAddMember" class="modal-overlay" (click)="showAddMember = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Add Member</h3>
            <input [(ngModel)]="addMemberUserId" placeholder="User ID (UUID)" class="form-input" />
            <div class="modal-actions">
              <button class="btn-cancel" (click)="showAddMember = false">Cancel</button>
              <button class="btn-primary" (click)="addMember()" [disabled]="!addMemberUserId.trim()">Add</button>
            </div>
          </div>
        </div>

        <!-- ═══ ASSIGNMENTS TAB ═══ -->
        <div *ngIf="activeTab === 'assignments'" class="tab-content">
          <div class="tab-header">
            <h3>Assignments</h3>
            <button class="btn-sm" (click)="showCreateAssignment = true">+ Create Assignment</button>
          </div>
          <div *ngIf="loadingAssignments" class="loading">Loading assignments...</div>
          <div *ngIf="!loadingAssignments && assignments.length === 0" class="empty">
            No assignments yet. Create one to get started.
          </div>
          <div class="assignment-list">
            <div *ngFor="let a of assignments" class="assignment-card">
              <div class="assignment-header">
                <div>
                  <h4>{{ a.title }}</h4>
                  <span class="type-badge" [attr.data-type]="a.type">{{ a.type }}</span>
                  <span *ngIf="!a.isPublished" class="draft-badge">Draft</span>
                </div>
                <div class="assignment-actions">
                  <button class="btn-sm" (click)="viewSubmissions(a)">Submissions</button>
                  <button class="btn-icon" title="Edit" (click)="editAssignment(a)">✏️</button>
                  <button class="btn-icon btn-danger" title="Delete" (click)="deleteAssignment(a)">🗑</button>
                </div>
              </div>
              <p *ngIf="a.description" class="assignment-desc">{{ a.description }}</p>
              <div class="assignment-meta">
                <span>Max score: {{ a.maxScore }}</span>
                <span *ngIf="a.type === 'file' && a.allowedFileTypes">Files: {{ a.allowedFileTypes }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Create/Edit Assignment Modal -->
        <div *ngIf="showCreateAssignment || editingAssignment" class="modal-overlay" (click)="closeAssignmentForm()">
          <div class="modal-card modal-wide" (click)="$event.stopPropagation()">
            <h3>{{ editingAssignment ? 'Edit Assignment' : 'Create Assignment' }}</h3>
            <input [(ngModel)]="assignmentForm.title" placeholder="Title *" class="form-input" />
            <textarea [(ngModel)]="assignmentForm.description" placeholder="Description / instructions" class="form-input" rows="3"></textarea>
            <div class="form-row">
              <label>Type:</label>
              <select [(ngModel)]="assignmentForm.type" class="form-select">
                <option value="offline">Offline (teacher marks complete)</option>
                <option value="file">File Submission (student uploads)</option>
                <option value="interaction">Interaction (auto-completed)</option>
              </select>
            </div>
            <div *ngIf="assignmentForm.type === 'file'" class="form-row">
              <label>Allowed file types:</label>
              <input [(ngModel)]="assignmentForm.allowedFileTypes" placeholder="pdf,docx,png,jpg" class="form-input" />
            </div>
            <div class="form-row">
              <label>Max score:</label>
              <input type="number" [(ngModel)]="assignmentForm.maxScore" class="form-input form-input-sm" min="0" />
            </div>
            <div class="form-row">
              <label>
                <input type="checkbox" [(ngModel)]="assignmentForm.isPublished" /> Published (visible to students)
              </label>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="closeAssignmentForm()">Cancel</button>
              <button class="btn-primary" (click)="saveAssignment()" [disabled]="!assignmentForm.title.trim()">
                {{ editingAssignment ? 'Save' : 'Create' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Submissions View Modal -->
        <div *ngIf="viewingSubmissions" class="modal-overlay" (click)="viewingSubmissions = null">
          <div class="modal-card modal-wide" (click)="$event.stopPropagation()">
            <div class="modal-header-row">
              <h3>Submissions: {{ viewingSubmissions.title }}</h3>
              <button class="btn-close" (click)="viewingSubmissions = null">✕</button>
            </div>
            <div *ngIf="loadingSubmissions" class="loading">Loading...</div>
            <div *ngIf="!loadingSubmissions && submissions.length === 0" class="empty">No submissions yet.</div>
            <div class="submission-list">
              <div *ngFor="let s of submissions" class="submission-card">
                <div class="submission-header">
                  <span class="submission-user">{{ s.userName }} ({{ s.userEmail }})</span>
                  <span class="status-badge" [attr.data-status]="s.status">{{ formatStatus(s.status) }}</span>
                  <span *ngIf="s.isLate" class="late-badge">LATE</span>
                </div>
                <div *ngIf="s.fileName" class="submission-file">
                  📎 {{ s.fileName }} ({{ formatFileSize(s.fileSize) }})
                  <a *ngIf="s.fileUrl" [href]="s.fileUrl" target="_blank" class="download-link">Download</a>
                </div>
                <p *ngIf="s.studentComment" class="submission-comment">💬 {{ s.studentComment }}</p>
                <div *ngIf="s.status === 'submitted' || s.status === 'resubmit_requested'" class="grading-form">
                  <div class="form-row">
                    <label>Score (0-{{ viewingSubmissions.maxScore }}):</label>
                    <input type="number" [(ngModel)]="gradeForm[s.id + '_score']" [min]="0" [max]="viewingSubmissions.maxScore" class="form-input form-input-sm" />
                  </div>
                  <textarea [(ngModel)]="gradeForm[s.id + '_feedback']" placeholder="Feedback..." class="form-input" rows="2"></textarea>
                  <div class="grading-actions">
                    <button class="btn-primary btn-sm" (click)="gradeSubmission(s)">Grade</button>
                    <button class="btn-sm btn-secondary" (click)="requestResubmission(s)">Request Resubmission</button>
                  </div>
                </div>
                <div *ngIf="s.status === 'graded'" class="graded-info">
                  <span class="score-display">Score: {{ s.score }}/{{ viewingSubmissions.maxScore }}</span>
                  <p *ngIf="s.graderFeedback" class="grader-feedback">{{ s.graderFeedback }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ DEADLINES TAB ═══ -->
        <div *ngIf="activeTab === 'deadlines'" class="tab-content">
          <div class="tab-header">
            <h3>Deadlines</h3>
            <button class="btn-sm" (click)="showBulkDeadline = true">Set Deadline for Group</button>
          </div>
          <div *ngIf="loadingDeadlines" class="loading">Loading deadlines...</div>
          <div *ngIf="!loadingDeadlines && deadlines.length === 0" class="empty">No deadlines set.</div>
          <div class="deadline-list">
            <div *ngFor="let d of deadlines" class="deadline-row" [class.past]="isPastDeadline(d)">
              <div class="deadline-info">
                <span class="deadline-user">{{ d.user?.username || d.user?.email || d.userId }}</span>
                <span class="deadline-date" [class.past]="isPastDeadline(d)">
                  {{ formatDate(d.deadlineAt) }}
                  <span *ngIf="isPastDeadline(d)" class="past-label">PAST</span>
                </span>
                <span *ngIf="d.note" class="deadline-note">{{ d.note }}</span>
              </div>
              <div class="deadline-actions">
                <button class="btn-icon btn-danger" title="Remove" (click)="deleteDeadline(d)">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Bulk Deadline Modal -->
        <div *ngIf="showBulkDeadline" class="modal-overlay" (click)="showBulkDeadline = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Set Deadline for All Group Members</h3>
            <div class="form-row">
              <label>Deadline:</label>
              <input type="datetime-local" [(ngModel)]="bulkDeadlineDate" class="form-input" />
            </div>
            <textarea [(ngModel)]="bulkDeadlineNote" placeholder="Note (optional)" class="form-input" rows="2"></textarea>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="showBulkDeadline = false">Cancel</button>
              <button class="btn-primary" (click)="setBulkDeadline()" [disabled]="!bulkDeadlineDate">Set Deadline</button>
            </div>
          </div>
        </div>

        <!-- ═══ PROGRESS TAB ═══ -->
        <div *ngIf="activeTab === 'progress'" class="tab-content">
          <div class="tab-header">
            <h3>Progress Overview</h3>
            <button class="btn-sm" (click)="loadProgress()">↻ Refresh</button>
          </div>
          <div *ngIf="loadingProgress" class="loading">Loading progress...</div>
          <div *ngIf="!loadingProgress && progress.length === 0" class="empty">No progress data yet.</div>
          <div class="progress-table" *ngIf="!loadingProgress && progress.length > 0">
            <div class="progress-header-row">
              <span class="col-name">Student</span>
              <span class="col-sm">Views</span>
              <span class="col-sm">Done</span>
              <span class="col-sm">Interactions</span>
              <span class="col-sm">Avg Score</span>
              <span class="col-med">Deadline</span>
            </div>
            <div *ngFor="let p of progress" class="progress-row" [class.past-deadline]="p.isPastDeadline">
              <span class="col-name">
                <span class="member-name">{{ p.name }}</span>
                <span class="member-email">{{ p.email }}</span>
              </span>
              <span class="col-sm">{{ p.views }}</span>
              <span class="col-sm">{{ p.completions }}</span>
              <span class="col-sm">{{ p.completedInteractions }}/{{ p.interactionCount }}</span>
              <span class="col-sm" [class.score-good]="p.averageScore != null && p.averageScore >= 70" [class.score-low]="p.averageScore != null && p.averageScore < 70">
                {{ p.averageScore != null ? p.averageScore + '%' : '–' }}
              </span>
              <span class="col-med" [class.past]="p.isPastDeadline">
                {{ p.deadline ? formatDate(p.deadline) : '–' }}
              </span>
            </div>
          </div>
        </div>

        <!-- ═══ LESSONS TAB (Course Groups only) ═══ -->
        <div *ngIf="activeTab === 'visibility'" class="tab-content">
          <!-- Course-wide lessons section -->
          <div class="tab-header">
            <h3>Course Lessons</h3>
            <div class="tab-header-actions">
              <button class="btn-sm" (click)="openAddLessonModal()">+ Add Lesson to Course</button>
              <button *ngIf="!selectedGroup?.isDefault" class="btn-sm" (click)="saveVisibility()" [disabled]="!visibilityDirty">Save Visibility</button>
            </div>
          </div>

          <div *ngIf="!selectedGroup?.isDefault" class="visibility-hint">
            <span class="hint-icon">ℹ️</span>
            <span>Toggle visibility to control which lessons this <strong>group</strong> can see. At least one published lesson must remain visible. Adding or removing lessons affects the <strong>entire course</strong>.</span>
          </div>
          <div *ngIf="selectedGroup?.isDefault" class="visibility-hint">
            <span class="hint-icon">ℹ️</span>
            <span>This is the default group. All published lessons are visible to all members. Select a custom group to manage per-group visibility.</span>
          </div>

          <div *ngIf="loadingVisibility" class="loading">Loading...</div>
          <div *ngIf="!loadingVisibility && lessonVisibility.length === 0" class="empty">No lessons in this course yet. Add lessons to get started.</div>
          <div class="visibility-list">
            <div *ngFor="let lv of lessonVisibility" class="visibility-row" [class.lesson-unpublished]="lv.status !== 'approved'">
              <!-- Non-default group: checkbox for visibility control -->
              <div class="visibility-label" *ngIf="!selectedGroup?.isDefault">
                <input type="checkbox"
                       [checked]="lv.isVisible && lv.status === 'approved'"
                       [disabled]="lv.status !== 'approved'"
                       (change)="onVisibilityToggle(lv, $event)" />
                <span [class.text-gray-500]="lv.status !== 'approved'">{{ lv.title }}</span>
                <span *ngIf="lv.status === 'approved'" class="status-pill published">Published</span>
                <span *ngIf="lv.status !== 'approved'" class="status-pill draft">{{ lv.status === 'pending' ? 'Pending' : 'In Construction' }}</span>
                <span *ngIf="lv.status !== 'approved'" class="hidden-auto-label">Auto-hidden</span>
              </div>
              <!-- Default group: read-only list -->
              <div class="visibility-label" *ngIf="selectedGroup?.isDefault">
                <span class="lesson-bullet">•</span>
                <span [class.text-gray-500]="lv.status !== 'approved'">{{ lv.title }}</span>
                <span *ngIf="lv.status === 'approved'" class="status-pill published">Published</span>
                <span *ngIf="lv.status !== 'approved'" class="status-pill draft">{{ lv.status === 'pending' ? 'Pending' : 'In Construction' }}</span>
              </div>
              <button class="btn-sm btn-editor" (click)="viewInLessonEditor(lv.lessonId); $event.stopPropagation()">
                ✏️ Edit in Lesson Editor
              </button>
            </div>
          </div>

          <!-- Snackbar -->
          <div *ngIf="snackbarMessage" class="snackbar">{{ snackbarMessage }}</div>
        </div>

        <!-- Add Lesson to Course Modal -->
        <div *ngIf="showAddLessonToCourse" class="modal-overlay" (click)="showAddLessonToCourse = false">
          <div class="modal-card modal-wide" (click)="$event.stopPropagation()">
            <h3>Add Lesson to Course</h3>
            <div class="course-add-info">
              <span class="hint-icon">ℹ️</span>
              <div>
                <p class="info-main">Lessons are added to the <strong>entire course</strong>, not just this group.</p>
                <p class="info-sub">Once added, you can control which groups can see each lesson using the visibility toggles.</p>
              </div>
            </div>
            <input [(ngModel)]="addLessonSearch" (input)="filterAvailableLessons()" placeholder="Search lessons by title..." class="form-input" />
            <div *ngIf="loadingAvailableLessons" class="loading">Loading lessons...</div>
            <div *ngIf="!loadingAvailableLessons && filteredAvailableLessons.length === 0" class="empty">
              {{ addLessonSearch ? 'No matching lessons found.' : 'No lessons available to add.' }}
            </div>
            <div class="available-lessons-list">
              <div *ngFor="let l of filteredAvailableLessons" class="available-lesson-row">
                <div class="lesson-info-col">
                  <span class="lesson-title">
                    {{ l.title }}
                    <span *ngIf="l.status === 'approved'" class="status-pill published">Published</span>
                    <span *ngIf="l.status !== 'approved'" class="status-pill draft">{{ l.status === 'pending' ? 'Pending' : 'Draft' }}</span>
                  </span>
                  <span class="lesson-meta">{{ l.category || 'Uncategorized' }} · {{ l.difficulty || 'Any level' }}</span>
                </div>
                <button class="btn-sm" (click)="addLessonToCourse(l)" [disabled]="addingLessonId === l.id">
                  {{ addingLessonId === l.id ? 'Adding...' : 'Add to Course' }}
                </button>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="showAddLessonToCourse = false">Close</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Invite Members Modal -->
      <div *ngIf="showInviteMembers" class="modal-overlay" (click)="showInviteMembers = false">
        <div class="modal-card modal-wide" (click)="$event.stopPropagation()">
          <h3>Invite Members</h3>
          <p class="modal-hint">Enter email addresses (one per line or comma-separated). Users with accounts will get an in-app notification. Others will receive an email invitation.</p>
          <textarea [(ngModel)]="inviteEmails" placeholder="user1@example.com&#10;user2@example.com" class="form-input" rows="5"></textarea>
          <div *ngIf="inviteResult" class="invite-result">
            <span *ngIf="inviteResult.invited > 0" class="invite-ok">{{ inviteResult.invited }} invited</span>
            <span *ngIf="inviteResult.alreadyMember > 0" class="invite-warn">{{ inviteResult.alreadyMember }} already members</span>
            <span *ngFor="let e of inviteResult.errors" class="invite-error">{{ e }}</span>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="showInviteMembers = false; inviteResult = null">Close</button>
            <button class="btn-primary" (click)="sendInvites()" [disabled]="!inviteEmails.trim() || inviteSending">
              {{ inviteSending ? 'Sending...' : 'Send Invitations' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Message Modal -->
      <app-messages-modal
        *ngIf="showMessageModal"
        [toUserId]="messageToUser?.id"
        [toUserEmail]="messageToUser?.email"
        [onClose]="closeMessage"
        [skipHideNav]="true">
      </app-messages-modal>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .group-mgmt { color: #fff; }

    /* ─── Group Selector ─── */
    .group-selector { margin-bottom: 1.5rem; }
    .group-tabs-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .group-tab {
      padding: 0.5rem 1rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: rgba(255,255,255,0.7);
      cursor: pointer;
      transition: all 0.2s;
      display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
    }
    .group-tab:hover { background: rgba(255,255,255,0.08); border-color: rgba(0,212,255,0.3); }
    .group-tab.active { background: rgba(0,212,255,0.15); border-color: #00d4ff; color: #fff; }
    .group-name { font-weight: 500; font-size: 0.9rem; }
    .group-count { font-size: 0.75rem; opacity: 0.6; }
    .add-group-btn { border-style: dashed; color: rgba(0,212,255,0.7); }
    .add-group-btn:hover { color: #00d4ff; }

    /* ─── Inner Tabs ─── */
    .inner-tab-row { display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 1.5rem; }
    .inner-tab {
      padding: 0.75rem 1.25rem;
      background: none; border: none; border-bottom: 2px solid transparent;
      color: rgba(255,255,255,0.6); cursor: pointer; font-size: 0.9rem;
      transition: all 0.2s;
    }
    .inner-tab:hover { color: #fff; }
    .inner-tab.active { color: #00d4ff; border-bottom-color: #00d4ff; }

    /* ─── Tab Content ─── */
    .tab-content { min-height: 200px; }
    .tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; }
    .tab-header h3 { margin: 0; font-size: 1.1rem; }
    .loading { color: rgba(255,255,255,0.5); padding: 1rem; text-align: center; }
    .empty { color: rgba(255,255,255,0.4); padding: 2rem; text-align: center; }

    /* ─── Inputs ─── */
    .search-input, .form-input {
      padding: 0.6rem 0.8rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px; color: #fff; font-size: 0.9rem; width: 100%;
    }
    .form-input-sm { width: 120px; }
    .form-select {
      padding: 0.6rem 0.8rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px; color: #fff; font-size: 0.9rem; width: 100%;
    }
    .form-select option { background: #1a1a2e; }
    .form-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .form-row label { min-width: 120px; font-size: 0.9rem; color: rgba(255,255,255,0.7); }
    .search-input::placeholder, .form-input::placeholder { color: rgba(255,255,255,0.3); }

    /* ─── Buttons ─── */
    .btn-primary {
      padding: 0.5rem 1rem; background: #00d4ff; color: #000; border: none;
      border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.85rem;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel {
      padding: 0.5rem 1rem; background: rgba(255,255,255,0.1); color: #fff; border: none;
      border-radius: 6px; cursor: pointer; font-size: 0.85rem;
    }
    .btn-sm {
      padding: 0.35rem 0.75rem; background: rgba(0,212,255,0.15); color: #00d4ff;
      border: 1px solid rgba(0,212,255,0.3); border-radius: 6px; cursor: pointer;
      font-size: 0.8rem; transition: all 0.2s; white-space: nowrap;
    }
    .btn-sm:hover { background: rgba(0,212,255,0.25); }
    .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.2); }
    .btn-icon {
      background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.25rem;
      transition: opacity 0.2s;
    }
    .btn-icon:hover { opacity: 0.8; }
    .btn-danger { color: #ef4444; }

    /* ─── Members ─── */
    .member-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .member-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1rem; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
    }
    .member-info { display: flex; flex-direction: column; gap: 0.15rem; }
    .member-name { font-weight: 500; font-size: 0.9rem; }
    .member-email { font-size: 0.8rem; color: rgba(255,255,255,0.5); }
    .member-actions { display: flex; gap: 0.5rem; }

    /* ─── Assignments ─── */
    .assignment-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .assignment-card {
      padding: 1rem; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
    }
    .assignment-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .assignment-header h4 { margin: 0 0.5rem 0 0; font-size: 1rem; }
    .assignment-actions { display: flex; gap: 0.25rem; align-items: center; }
    .assignment-desc { margin: 0.5rem 0 0; font-size: 0.85rem; color: rgba(255,255,255,0.6); }
    .assignment-meta { margin-top: 0.5rem; font-size: 0.8rem; color: rgba(255,255,255,0.4); display: flex; gap: 1rem; }
    .type-badge {
      display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px;
      font-size: 0.7rem; text-transform: uppercase; font-weight: 600;
    }
    .type-badge[data-type="offline"] { background: rgba(168,85,247,0.2); color: #a855f7; }
    .type-badge[data-type="file"] { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .type-badge[data-type="interaction"] { background: rgba(34,197,94,0.2); color: #22c55e; }
    .draft-badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; background: rgba(251,191,36,0.2); color: #fbbf24; }

    /* ─── Submissions ─── */
    .submission-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 60vh; overflow-y: auto; }
    .submission-card {
      padding: 1rem; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
    }
    .submission-header { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .submission-user { font-weight: 500; }
    .status-badge {
      display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px;
      font-size: 0.7rem; text-transform: uppercase; font-weight: 600;
    }
    .status-badge[data-status="not_started"] { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
    .status-badge[data-status="in_progress"] { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .status-badge[data-status="submitted"] { background: rgba(251,191,36,0.2); color: #fbbf24; }
    .status-badge[data-status="graded"] { background: rgba(34,197,94,0.2); color: #22c55e; }
    .status-badge[data-status="late"] { background: rgba(239,68,68,0.2); color: #ef4444; }
    .status-badge[data-status="resubmit_requested"] { background: rgba(168,85,247,0.2); color: #a855f7; }
    .late-badge { background: rgba(239,68,68,0.2); color: #ef4444; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
    .submission-file { font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-bottom: 0.5rem; }
    .download-link { color: #00d4ff; margin-left: 0.5rem; text-decoration: underline; }
    .submission-comment { font-size: 0.85rem; color: rgba(255,255,255,0.5); margin: 0.25rem 0; }
    .grading-form { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.08); }
    .grading-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .graded-info { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.08); }
    .score-display { font-weight: 600; color: #22c55e; font-size: 1rem; }
    .grader-feedback { font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-top: 0.25rem; }

    /* ─── Deadlines ─── */
    .deadline-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .deadline-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1rem; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
    }
    .deadline-row.past { border-color: rgba(239,68,68,0.3); }
    .deadline-info { display: flex; flex-direction: column; gap: 0.15rem; }
    .deadline-user { font-weight: 500; font-size: 0.9rem; }
    .deadline-date { font-size: 0.85rem; color: rgba(255,255,255,0.6); }
    .deadline-date.past { color: #ef4444; }
    .past-label { font-size: 0.7rem; font-weight: 600; color: #ef4444; margin-left: 0.5rem; }
    .deadline-note { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
    .deadline-actions { display: flex; gap: 0.5rem; }

    /* ─── Progress Table ─── */
    .progress-table { font-size: 0.85rem; }
    .progress-header-row, .progress-row {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.6rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .progress-header-row { font-weight: 600; color: rgba(255,255,255,0.6); border-bottom-color: rgba(255,255,255,0.15); }
    .progress-row:hover { background: rgba(255,255,255,0.03); }
    .progress-row.past-deadline { border-left: 3px solid #ef4444; }
    .col-name { flex: 2; display: flex; flex-direction: column; }
    .col-sm { flex: 0.7; text-align: center; }
    .col-med { flex: 1.2; text-align: center; }
    .score-good { color: #22c55e; font-weight: 500; }
    .score-low { color: #fbbf24; font-weight: 500; }
    .past { color: #ef4444; }

    /* ─── Modals ─── */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .modal-card {
      background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 1.5rem; width: 400px; max-width: 95vw;
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .modal-card h3 { margin: 0; font-size: 1.1rem; color: #fff; }
    .modal-wide { width: 700px; max-height: 80vh; overflow-y: auto; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
    .modal-header-row { display: flex; justify-content: space-between; align-items: center; }
    .btn-close { background: none; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; }

    /* ─── Invite ─── */
    .tab-header-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
    .invite-badge { display: inline-block; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; background: rgba(251,191,36,0.2); color: #fbbf24; font-weight: 600; }
    .member-row.invited { opacity: 0.7; border-style: dashed; }
    .modal-hint { font-size: 0.85rem; color: rgba(255,255,255,0.5); margin: 0; }
    .invite-result { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .invite-ok { color: #22c55e; font-size: 0.85rem; }
    .invite-warn { color: #fbbf24; font-size: 0.85rem; }
    .invite-error { color: #ef4444; font-size: 0.85rem; }

    /* ─── Group Tab Wrapper (for delete button) ─── */
    .group-tab-wrapper { position: relative; display: inline-flex; }
    .group-delete-btn {
      position: absolute; top: -6px; right: -6px;
      width: 20px; height: 20px; border-radius: 50%;
      background: rgba(239,68,68,0.8); color: #fff; border: none;
      font-size: 0.65rem; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s;
      z-index: 2; line-height: 1;
    }
    .group-tab-wrapper:hover .group-delete-btn { opacity: 1; }
    .group-delete-btn:hover { background: #ef4444; }

    /* ─── Delete Confirmation ─── */
    .delete-warning { color: #fff; font-size: 0.95rem; margin: 0; }
    .delete-info {
      display: flex; align-items: flex-start; gap: 0.5rem;
      padding: 0.75rem; background: rgba(251,191,36,0.1);
      border: 1px solid rgba(251,191,36,0.3); border-radius: 8px;
      font-size: 0.85rem; color: rgba(255,255,255,0.8);
    }
    .warning-icon { font-size: 1.2rem; flex-shrink: 0; }
    .delete-note { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; }
    .btn-danger-action {
      padding: 0.5rem 1rem; background: #ef4444; color: #fff; border: none;
      border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.85rem;
    }
    .btn-danger-action:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger-action:hover:not(:disabled) { background: #dc2626; }

    /* ─── Lessons / Visibility ─── */
    .visibility-hint {
      display: flex; align-items: flex-start; gap: 0.5rem;
      padding: 0.6rem 0.75rem; margin-bottom: 1rem;
      background: rgba(0,212,255,0.05); border: 1px solid rgba(0,212,255,0.15);
      border-radius: 8px; font-size: 0.82rem; color: rgba(255,255,255,0.7);
    }
    .hint-icon { font-size: 1rem; flex-shrink: 0; }
    .visibility-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .visibility-row { padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .visibility-label { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; font-size: 0.9rem; }
    .visibility-label input[type="checkbox"] { width: 18px; height: 18px; accent-color: #00d4ff; }
    .lesson-bullet { color: #00d4ff; font-size: 1.2rem; }

    /* ─── Lesson Status Badges ─── */
    .status-pill {
      display: inline-block; padding: 0.1rem 0.5rem; border-radius: 4px;
      font-size: 0.7rem; text-transform: uppercase; font-weight: 600; margin-left: 0.5rem;
    }
    .status-pill.published { background: rgba(34,197,94,0.2); color: #22c55e; }
    .status-pill.draft { background: rgba(251,191,36,0.2); color: #fbbf24; }
    .hidden-auto-label {
      font-size: 0.7rem; color: rgba(239,68,68,0.7); margin-left: 0.5rem;
    }
    .lesson-unpublished { opacity: 0.65; }
    .btn-editor {
      flex-shrink: 0; font-size: 0.75rem !important;
      padding: 0.25rem 0.6rem !important;
    }

    /* ─── Snackbar ─── */
    .snackbar {
      position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
      background: #333; color: #fff; padding: 0.75rem 1.5rem;
      border-radius: 8px; font-size: 0.9rem; z-index: 2000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      animation: snackIn 0.3s ease-out;
    }
    @keyframes snackIn {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    /* ─── Add Lesson to Course Modal ─── */
    .course-add-info {
      display: flex; align-items: flex-start; gap: 0.5rem;
      padding: 0.75rem; background: rgba(0,212,255,0.08);
      border: 1px solid rgba(0,212,255,0.2); border-radius: 8px;
    }
    .info-main { margin: 0 0 0.25rem; font-size: 0.9rem; color: #fff; }
    .info-sub { margin: 0; font-size: 0.8rem; color: rgba(255,255,255,0.5); }
    .available-lessons-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 40vh; overflow-y: auto; }
    .available-lesson-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.6rem 0.75rem; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;
    }
    .lesson-info-col { display: flex; flex-direction: column; gap: 0.1rem; }
    .lesson-title { font-size: 0.9rem; font-weight: 500; }
    .lesson-meta { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
  `],
})
export class GroupManagementComponent implements OnInit, OnDestroy {
  @Input() lessonId!: string;
  @Input() courseId = '';

  private destroy$ = new Subject<void>();
  isCourseMode = false;

  // Groups
  groups: LessonGroup[] = [];
  selectedGroup: LessonGroup | null = null;
  showCreateGroup = false;
  newGroupName = '';
  newGroupDesc = '';

  // Inner tabs (dynamically set based on mode)
  innerTabs: { id: GroupTab; icon: string; label: string }[] = [];
  activeTab: GroupTab = 'members';

  // Members
  members: GroupMember[] = [];
  memberSearch = '';
  loadingMembers = false;
  showAddMember = false;
  addMemberUserId = '';

  // Assignments
  assignments: Assignment[] = [];
  loadingAssignments = false;
  showCreateAssignment = false;
  editingAssignment: Assignment | null = null;
  assignmentForm = {
    title: '',
    description: '',
    type: 'offline' as AssignmentType,
    allowedFileTypes: '',
    maxScore: 100,
    isPublished: true,
  };

  // Submissions
  viewingSubmissions: Assignment | null = null;
  submissions: AssignmentSubmission[] = [];
  loadingSubmissions = false;
  gradeForm: { [key: string]: any } = {};

  // Deadlines
  deadlines: UserLessonDeadline[] = [];
  loadingDeadlines = false;
  showBulkDeadline = false;
  bulkDeadlineDate = '';
  bulkDeadlineNote = '';

  // Progress
  progress: GroupProgress[] = [];
  loadingProgress = false;

  // Invite
  showInviteMembers = false;
  inviteEmails = '';
  inviteSending = false;
  inviteResult: { invited: number; alreadyMember: number; errors: string[] } | null = null;

  // Lesson Visibility (course groups only)
  lessonVisibility: LessonVisibility[] = [];
  loadingVisibility = false;
  visibilityDirty = false;

  // Add Lesson to Course
  showAddLessonToCourse = false;
  allAvailableLessons: any[] = [];
  filteredAvailableLessons: any[] = [];
  loadingAvailableLessons = false;
  addLessonSearch = '';
  addingLessonId: string | null = null;

  // Delete group
  groupToDelete: LessonGroup | null = null;
  deletingGroup = false;

  // Messaging
  showMessageModal = false;
  messageToUser: GroupMember | null = null;

  // Snackbar
  snackbarMessage = '';

  constructor(
    private groupsService: LessonGroupsService,
    private coursesService: CoursesService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.isCourseMode = !!this.courseId && !this.lessonId;
    this.buildTabs();
    if (this.isCourseMode) {
      this.loadCourseGroups();
    } else if (this.lessonId) {
      this.loadGroups();
    }
  }

  private buildTabs() {
    this.innerTabs = [
      { id: 'members', icon: '👥', label: 'Members' },
      { id: 'assignments', icon: '📝', label: 'Assignments' },
      { id: 'deadlines', icon: '⏰', label: 'Deadlines' },
      { id: 'progress', icon: '📊', label: 'Progress' },
    ];
    if (this.isCourseMode) {
      this.innerTabs.push({ id: 'visibility', icon: '📚', label: 'Lessons' });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Groups ───

  async loadGroups() {
    try {
      this.groups = await firstValueFrom(this.groupsService.getGroups(this.lessonId));
      if (this.groups.length > 0 && !this.selectedGroup) {
        this.selectGroup(this.groups[0]);
      }
    } catch (err) {
      console.error('[GroupMgmt] Failed to load groups:', err);
    }
  }

  selectGroup(group: LessonGroup) {
    this.selectedGroup = group;
    this.loadTabData();
  }

  async loadCourseGroups() {
    try {
      this.groups = await firstValueFrom(this.groupsService.getCourseGroups(this.courseId));
      if (this.groups.length > 0 && !this.selectedGroup) {
        this.selectGroup(this.groups[0]);
      }
    } catch (err) {
      console.error('[GroupMgmt] Failed to load course groups:', err);
    }
  }

  async createGroup() {
    if (!this.newGroupName.trim()) return;
    try {
      if (this.isCourseMode) {
        await firstValueFrom(this.groupsService.createCourseGroup(this.courseId, this.newGroupName.trim(), this.newGroupDesc.trim() || undefined));
      } else {
        await firstValueFrom(this.groupsService.createGroup(this.lessonId, this.newGroupName.trim(), this.newGroupDesc.trim() || undefined));
      }
      this.showCreateGroup = false;
      this.newGroupName = '';
      this.newGroupDesc = '';
      if (this.isCourseMode) {
        await this.loadCourseGroups();
      } else {
        await this.loadGroups();
      }
    } catch (err) {
      console.error('[GroupMgmt] Failed to create group:', err);
    }
  }

  // ─── Delete Group ───

  confirmDeleteGroup(group: LessonGroup) {
    this.groupToDelete = group;
  }

  async executeDeleteGroup() {
    if (!this.groupToDelete) return;
    this.deletingGroup = true;
    try {
      const result: any = await firstValueFrom(this.groupsService.deleteGroup(this.groupToDelete.id));
      const notified = result?.notifiedCount ?? 0;
      alert(`Group "${result?.deletedGroupName || this.groupToDelete.name}" deleted. ${notified} member(s) notified.`);
      this.groupToDelete = null;
      this.selectedGroup = null;
      if (this.isCourseMode) {
        await this.loadCourseGroups();
      } else {
        await this.loadGroups();
      }
    } catch (err: any) {
      alert(err?.error?.message || err?.message || 'Failed to delete group');
    } finally {
      this.deletingGroup = false;
    }
  }

  // ─── Tab Data Loading ───

  loadTabData() {
    if (!this.selectedGroup) return;
    switch (this.activeTab) {
      case 'members': this.loadMembers(); break;
      case 'assignments': this.loadAssignments(); break;
      case 'deadlines': this.loadDeadlines(); break;
      case 'progress': this.loadProgress(); break;
      case 'visibility': this.loadVisibility(); break;
    }
  }

  // ─── Members ───

  async loadMembers() {
    if (!this.selectedGroup) return;
    this.loadingMembers = true;
    try {
      this.members = await firstValueFrom(
        this.groupsService.getMembers(this.selectedGroup.id, this.memberSearch.trim() || undefined)
      );
    } catch (err) {
      console.error('[GroupMgmt] Failed to load members:', err);
      this.members = [];
    } finally {
      this.loadingMembers = false;
    }
  }

  searchMembers() {
    setTimeout(() => this.loadMembers(), 300);
  }

  async addMember() {
    if (!this.selectedGroup || !this.addMemberUserId.trim()) return;
    try {
      await firstValueFrom(this.groupsService.addMember(this.selectedGroup.id, this.addMemberUserId.trim()));
      this.showAddMember = false;
      this.addMemberUserId = '';
      await this.loadMembers();
      await this.loadGroups();
    } catch (err: any) {
      alert(err?.error?.message || 'Failed to add member');
    }
  }

  async removeMember(member: GroupMember) {
    if (!this.selectedGroup || !confirm(`Remove ${member.name} from this group?`)) return;
    try {
      await firstValueFrom(this.groupsService.removeMember(this.selectedGroup.id, member.id));
      await this.loadMembers();
      await this.loadGroups();
    } catch (err) {
      console.error('[GroupMgmt] Failed to remove member:', err);
    }
  }

  // ─── Assignments ───

  async loadAssignments() {
    if (!this.selectedGroup) return;
    this.loadingAssignments = true;
    try {
      if (this.isCourseMode) {
        // For course groups, load assignments for all lessons in the course
        // We get the child lesson groups and load assignments per lesson
        this.assignments = []; // TODO: aggregate course assignments when backend supports it
      } else {
        this.assignments = await firstValueFrom(
          this.groupsService.getAssignments(this.lessonId, this.selectedGroup.id)
        );
      }
    } catch (err) {
      console.error('[GroupMgmt] Failed to load assignments:', err);
      this.assignments = [];
    } finally {
      this.loadingAssignments = false;
    }
  }

  editAssignment(a: Assignment) {
    this.editingAssignment = a;
    this.assignmentForm = {
      title: a.title,
      description: a.description || '',
      type: a.type,
      allowedFileTypes: a.allowedFileTypes || '',
      maxScore: a.maxScore,
      isPublished: a.isPublished,
    };
  }

  closeAssignmentForm() {
    this.showCreateAssignment = false;
    this.editingAssignment = null;
    this.assignmentForm = { title: '', description: '', type: 'offline', allowedFileTypes: '', maxScore: 100, isPublished: true };
  }

  async saveAssignment() {
    if (!this.assignmentForm.title.trim()) return;
    try {
      const data: any = {
        title: this.assignmentForm.title.trim(),
        description: this.assignmentForm.description.trim() || null,
        type: this.assignmentForm.type,
        maxScore: this.assignmentForm.maxScore,
        isPublished: this.assignmentForm.isPublished,
      };
      if (this.assignmentForm.type === 'file' && this.assignmentForm.allowedFileTypes.trim()) {
        data.allowedFileTypes = this.assignmentForm.allowedFileTypes.trim();
      }
      if (this.selectedGroup && !this.selectedGroup.isDefault) {
        data.groupId = this.selectedGroup.id;
      }

      if (this.editingAssignment) {
        await firstValueFrom(this.groupsService.updateAssignment(this.editingAssignment.id, data));
      } else {
        await firstValueFrom(this.groupsService.createAssignment(this.lessonId, data));
      }
      this.closeAssignmentForm();
      await this.loadAssignments();
    } catch (err: any) {
      alert(err?.error?.message || 'Failed to save assignment');
    }
  }

  async deleteAssignment(a: Assignment) {
    if (!confirm(`Delete assignment "${a.title}"?`)) return;
    try {
      await firstValueFrom(this.groupsService.deleteAssignment(a.id));
      await this.loadAssignments();
    } catch (err) {
      console.error('[GroupMgmt] Failed to delete assignment:', err);
    }
  }

  // ─── Submissions ───

  async viewSubmissions(a: Assignment) {
    this.viewingSubmissions = a;
    this.loadingSubmissions = true;
    this.gradeForm = {};
    try {
      this.submissions = await firstValueFrom(this.groupsService.getSubmissions(a.id));
    } catch (err) {
      console.error('[GroupMgmt] Failed to load submissions:', err);
      this.submissions = [];
    } finally {
      this.loadingSubmissions = false;
    }
  }

  async gradeSubmission(s: AssignmentSubmission) {
    const score = parseInt(this.gradeForm[s.id + '_score'], 10);
    const feedback = this.gradeForm[s.id + '_feedback'] || '';
    if (isNaN(score)) { alert('Please enter a valid score'); return; }
    try {
      await firstValueFrom(this.groupsService.gradeSubmission(s.id, score, feedback));
      if (this.viewingSubmissions) await this.viewSubmissions(this.viewingSubmissions);
    } catch (err: any) {
      alert(err?.error?.message || 'Failed to grade submission');
    }
  }

  async requestResubmission(s: AssignmentSubmission) {
    const feedback = this.gradeForm[s.id + '_feedback'] || 'Please resubmit your work.';
    try {
      await firstValueFrom(this.groupsService.requestResubmission(s.id, feedback));
      if (this.viewingSubmissions) await this.viewSubmissions(this.viewingSubmissions);
    } catch (err: any) {
      alert(err?.error?.message || 'Failed to request resubmission');
    }
  }

  // ─── Deadlines ───

  async loadDeadlines() {
    this.loadingDeadlines = true;
    try {
      if (this.isCourseMode) {
        this.deadlines = await firstValueFrom(this.groupsService.getCourseDeadlines(this.courseId));
      } else {
        this.deadlines = await firstValueFrom(this.groupsService.getDeadlines(this.lessonId));
      }
    } catch (err) {
      console.error('[GroupMgmt] Failed to load deadlines:', err);
      this.deadlines = [];
    } finally {
      this.loadingDeadlines = false;
    }
  }

  async setBulkDeadline() {
    if (!this.selectedGroup || !this.bulkDeadlineDate) return;
    try {
      const result = await firstValueFrom(
        this.groupsService.setBulkDeadline(this.lessonId, this.selectedGroup.id, new Date(this.bulkDeadlineDate).toISOString(), this.bulkDeadlineNote.trim() || undefined)
      );
      alert(`Deadline set for ${result.count} members`);
      this.showBulkDeadline = false;
      this.bulkDeadlineDate = '';
      this.bulkDeadlineNote = '';
      await this.loadDeadlines();
    } catch (err: any) {
      alert(err?.error?.message || 'Failed to set bulk deadline');
    }
  }

  async deleteDeadline(d: UserLessonDeadline) {
    if (!confirm('Remove this deadline?')) return;
    try {
      await firstValueFrom(this.groupsService.deleteDeadline(d.id));
      await this.loadDeadlines();
    } catch (err) {
      console.error('[GroupMgmt] Failed to delete deadline:', err);
    }
  }

  isPastDeadline(d: UserLessonDeadline): boolean {
    return new Date() > new Date(d.deadlineAt);
  }

  // ─── Progress ───

  async loadProgress() {
    if (!this.selectedGroup) return;
    this.loadingProgress = true;
    try {
      this.progress = await firstValueFrom(this.groupsService.getGroupProgress(this.selectedGroup.id));
    } catch (err) {
      console.error('[GroupMgmt] Failed to load progress:', err);
      this.progress = [];
    } finally {
      this.loadingProgress = false;
    }
  }

  // ─── Invite Members ───

  async sendInvites() {
    if (!this.selectedGroup || !this.inviteEmails.trim()) return;
    const emails = this.inviteEmails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    if (emails.length === 0) return;

    this.inviteSending = true;
    try {
      this.inviteResult = await firstValueFrom(this.groupsService.inviteMembers(this.selectedGroup.id, emails));
      this.inviteEmails = '';
      await this.loadMembers();
      if (this.isCourseMode) {
        await this.loadCourseGroups();
      } else {
        await this.loadGroups();
      }
    } catch (err: any) {
      alert(err?.error?.message || 'Failed to send invitations');
    } finally {
      this.inviteSending = false;
    }
  }

  // ─── Lessons & Visibility (course groups) ───

  async loadVisibility() {
    if (!this.selectedGroup || !this.isCourseMode) return;
    this.loadingVisibility = true;
    try {
      const data = await firstValueFrom(this.groupsService.getCourseGroupLessonVisibility(this.selectedGroup.id));
      // Force unpublished lessons to be hidden regardless of visibility setting
      this.lessonVisibility = data.map(lv => ({
        ...lv,
        isVisible: lv.status === 'approved' ? lv.isVisible : false,
      }));
      this.visibilityDirty = false;
    } catch (err) {
      console.error('[GroupMgmt] Failed to load visibility:', err);
      this.lessonVisibility = [];
    } finally {
      this.loadingVisibility = false;
    }
  }

  async saveVisibility() {
    if (!this.selectedGroup) return;
    // Validate at least 1 published lesson is visible
    const visiblePublished = this.lessonVisibility.filter(lv => lv.status === 'approved' && lv.isVisible);
    if (visiblePublished.length === 0) {
      this.showSnackbar('At least one published lesson must remain visible in a published course');
      return;
    }
    try {
      const updates = this.lessonVisibility.map((lv) => ({
        lessonId: lv.lessonId,
        isVisible: lv.isVisible,
      }));
      await firstValueFrom(this.groupsService.updateCourseGroupLessonVisibility(this.selectedGroup.id, updates));
      this.visibilityDirty = false;
      this.showSnackbar('Visibility settings saved.');
    } catch (err: any) {
      alert(err?.error?.message || 'Failed to save visibility');
    }
  }

  // ─── Add Lesson to Course ───

  async loadAvailableLessons() {
    if (!this.isCourseMode) return;
    this.loadingAvailableLessons = true;
    try {
      // Fetch all lessons and current course lessons
      const [allLessons, courseLessons] = await Promise.all([
        firstValueFrom(this.coursesService.getAvailableLessons()),
        firstValueFrom(this.coursesService.getCourseLessons(this.courseId)),
      ]);
      const courseLessonIds = new Set(courseLessons.map((l: any) => l.id));
      this.allAvailableLessons = allLessons.filter((l: any) => !courseLessonIds.has(l.id));
      this.filterAvailableLessons();
    } catch (err) {
      console.error('[GroupMgmt] Failed to load available lessons:', err);
      this.allAvailableLessons = [];
      this.filteredAvailableLessons = [];
    } finally {
      this.loadingAvailableLessons = false;
    }
  }

  filterAvailableLessons() {
    const term = this.addLessonSearch.trim().toLowerCase();
    if (!term) {
      this.filteredAvailableLessons = [...this.allAvailableLessons];
    } else {
      this.filteredAvailableLessons = this.allAvailableLessons.filter((l: any) =>
        l.title?.toLowerCase().includes(term) || l.category?.toLowerCase().includes(term)
      );
    }
  }

  openAddLessonModal() {
    this.showAddLessonToCourse = true;
    this.addLessonSearch = '';
    this.loadAvailableLessons();
  }

  async addLessonToCourse(lesson: any) {
    this.addingLessonId = lesson.id;
    try {
      await firstValueFrom(this.coursesService.addLesson(this.courseId, lesson.id));
      // Remove from available list
      this.allAvailableLessons = this.allAvailableLessons.filter((l: any) => l.id !== lesson.id);
      this.filterAvailableLessons();
      // Refresh visibility list to show the new lesson
      await this.loadVisibility();
    } catch (err: any) {
      alert(err?.error?.message || err?.message || 'Failed to add lesson to course');
    } finally {
      this.addingLessonId = null;
    }
  }

  // ─── Visibility Toggle with validation ───

  onVisibilityToggle(lv: LessonVisibility, event: Event) {
    if (lv.status !== 'approved') {
      // Prevent toggling unpublished lessons
      (event.target as HTMLInputElement).checked = false;
      this.showSnackbar('Lessons must be published to make them visible');
      return;
    }
    lv.isVisible = (event.target as HTMLInputElement).checked;
    this.visibilityDirty = true;
  }

  viewInLessonEditor(lessonId: string) {
    this.router.navigate(['/lesson-editor', lessonId]);
  }

  showSnackbar(message: string) {
    this.snackbarMessage = message;
    setTimeout(() => { this.snackbarMessage = ''; }, 3000);
  }

  // ─── Messaging ───

  openMessage(member: GroupMember) {
    this.messageToUser = member;
    this.showMessageModal = true;
  }

  closeMessage = () => {
    this.showMessageModal = false;
    this.messageToUser = null;
  };

  // ─── Utilities ───

  formatDate(date: string | Date): string {
    if (!date) return '–';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatFileSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

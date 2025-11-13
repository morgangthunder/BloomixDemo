import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import the true-false selection component for preview
import { TrueFalseSelectionComponent } from '../interactions/true-false-selection/true-false-selection.component';
import { InteractionConfigureModalComponent } from '../../shared/components/interaction-configure-modal/interaction-configure-modal.component';

interface InteractionType {
  id: string;
  name: string;
  description: string;
  interactionTypeCategory?: 'html' | 'pixijs' | 'iframe';
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
  iframeUrl?: string;
  iframeConfig?: any;
  category?: string;
  pixiRenderer?: string;
  isActive?: boolean;
  schema?: any;
  generationPrompt?: string;
  configSchema?: any; // New: defines what lesson-builders can configure
  sampleData?: any; // New: sample JSON for preview
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

@Component({
  selector: 'app-interaction-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, TrueFalseSelectionComponent, InteractionConfigureModalComponent],
  template: `
    <div class="interaction-builder">
      <!-- Header -->
      <header class="builder-header">
        <button (click)="goBack()" class="btn-icon" title="Back">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
        </button>
        <h1>Interaction Builder</h1>
        <div class="header-actions" style="display: flex; gap: 0.75rem;">
          <button (click)="resetToLastWorking()" 
                  class="btn-secondary" 
                  [disabled]="!hasLastWorking" 
                  title="Reset to last working version"
                  style="padding: 0.625rem 1.25rem; border-radius: 0.5rem; background: #2a2a2a; color: white; border: 1px solid #444; font-weight: 500;">
            🔄 Reset
          </button>
          <button (click)="saveInteraction()" 
                  [disabled]="saving" 
                  title="Save all changes"
                  style="padding: 0.625rem 1.5rem; border-radius: 0.5rem; background: #00d4ff !important; color: #0f0f23 !important; font-weight: 700 !important; border: none; font-size: 1rem; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 212, 255, 0.4);">
            {{ saving ? '⏳ Saving...' : '💾 SAVE' }}
          </button>
        </div>
      </header>

      <div class="builder-layout">
        <!-- Sidebar: Interaction Library -->
        <aside class="interaction-library" [class.mobile-hidden]="sidebarHidden">
          <div class="library-header">
            <h2>Interactions</h2>
            <button (click)="createNew()" class="btn-small btn-primary">+ New</button>
          </div>

          <!-- Search & Filter -->
          <div class="library-filters">
            <div class="search-box">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <input type="text" 
                     [(ngModel)]="searchQuery" 
                     (ngModelChange)="filterInteractions()"
                     placeholder="Search interactions..." />
              <button *ngIf="searchQuery" (click)="searchQuery = ''; filterInteractions()" class="clear-search">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"/>
                </svg>
              </button>
            </div>

            <div class="type-filter">
              <select [(ngModel)]="typeFilter" (ngModelChange)="filterInteractions()">
                <option value="">All Types</option>
                <option value="html">🌐 HTML</option>
                <option value="pixijs">🎮 PixiJS</option>
                <option value="iframe">🖼️ iFrame</option>
                <option value="legacy">📦 Legacy</option>
              </select>
            </div>
          </div>
          
          <div class="interactions-list">
            <div *ngFor="let interaction of filteredInteractions" 
                 class="interaction-item"
                 [class.active]="currentInteraction?.id === interaction.id"
                 (click)="loadInteraction(interaction)">
              <div class="interaction-icon">
                <span *ngIf="interaction.interactionTypeCategory === 'html'">🌐</span>
                <span *ngIf="interaction.interactionTypeCategory === 'pixijs'">🎮</span>
                <span *ngIf="interaction.interactionTypeCategory === 'iframe'">🖼️</span>
                <span *ngIf="!interaction.interactionTypeCategory">📦</span>
              </div>
              <div class="interaction-info">
                <div class="interaction-name">{{interaction.name}}</div>
                <div class="interaction-type">{{getTypeLabel(interaction.interactionTypeCategory)}}</div>
              </div>
            </div>

            <div *ngIf="filteredInteractions.length === 0 && interactions.length > 0" class="empty-state">
              No interactions match your filter.
            </div>

            <div *ngIf="interactions.length === 0" class="empty-state">
              No interactions yet. Click "New" to create one.
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="builder-main">
          <div class="editor-container" [class.no-interaction]="!currentInteraction">
            <!-- Tabs -->
            <div class="editor-tabs-main">
              <button class="sidebar-toggle mobile-only" (click)="toggleSidebar()">
                {{ sidebarHidden ? '📚 Show' : '📚 Hide' }}
              </button>
              <button [class.active]="activeTab === 'settings'" 
                      (click)="switchTab('settings')">⚙️ Settings</button>
              <button [class.active]="activeTab === 'code'" 
                      (click)="switchTab('code')">💻 Code</button>
              <button [class.active]="activeTab === 'config'" 
                      (click)="switchTab('config')">🔧 Config</button>
              <button [class.active]="activeTab === 'sample'" 
                      (click)="switchTab('sample')">📋 Sample</button>
              <button [class.active]="activeTab === 'preview'" 
                      (click)="switchTab('preview')">👁️ Preview</button>
            </div>

            <!-- Empty State -->
            <div *ngIf="!currentInteraction" class="empty-builder-inline">
              <div class="empty-icon">🎯</div>
              <h2>Select an interaction to edit</h2>
              <p>Or create a new one to get started</p>
            </div>

            <!-- Settings Tab -->
            <div *ngIf="activeTab === 'settings'" class="tab-content">
              <div class="info-section">
                <h3>Basic Information</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Interaction ID *</label>
                    <input type="text" [(ngModel)]="currentInteraction.id" 
                           (ngModelChange)="markChanged()"
                           [disabled]="!isNewInteraction"
                           placeholder="e.g., my-custom-interaction" />
                    <small class="hint">Unique identifier (cannot be changed after creation)</small>
                  </div>
                  <div class="form-group">
                    <label>Name *</label>
                    <input type="text" [(ngModel)]="currentInteraction.name" 
                           (ngModelChange)="markChanged()"
                           placeholder="e.g., Drag and Drop Sorting" />
                  </div>
                </div>

                <div class="form-group">
                  <label>Description *</label>
                  <textarea [(ngModel)]="currentInteraction.description" 
                            (ngModelChange)="markChanged()"
                            rows="2"
                            placeholder="Describe what this interaction does"></textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Interaction Type *</label>
                    <select [(ngModel)]="currentInteraction.interactionTypeCategory" 
                            [disabled]="!isNewInteraction"
                            (ngModelChange)="onTypeChange()">
                      <option value="">Select type...</option>
                      <option value="html">🌐 HTML (Custom HTML/CSS/JS)</option>
                      <option value="pixijs">🎮 PixiJS (TypeScript Game/Animation)</option>
                      <option value="iframe">🖼️ iFrame (External Embed)</option>
                    </select>
                    <small class="hint">Cannot be changed after creation</small>
                  </div>
                  <div class="form-group">
                    <label>TEACH Stage Category</label>
                    <select [(ngModel)]="currentInteraction.category" (ngModelChange)="markChanged()">
                      <option value="">Optional...</option>
                      <option value="tease-trigger">Tease - Trigger</option>
                      <option value="explore-experiment">Explore - Experiment</option>
                      <option value="absorb-show">Absorb - Show</option>
                      <option value="cultivate-practice">Cultivate - Practice</option>
                      <option value="hone-apply">Hone - Apply</option>
                  </select>
                </div>
              </div>

              <!-- Settings Actions -->
              <div class="settings-actions">
                <button (click)="saveInteraction()" class="btn-save-inline" [disabled]="saving">
                  {{ saving ? '⏳ Saving...' : '💾 Save' }}
                </button>
              </div>
            </div>
            </div>

            <!-- Code Tab -->
            <div *ngIf="activeTab === 'code'" class="tab-content">
              <div class="code-section">
                <div class="section-header">
                  <h3>Interaction Code</h3>
                  <p class="hint">Define the actual code that runs this interaction</p>
                </div>

                <!-- HTML Type Code Editor -->
                <div *ngIf="currentInteraction.interactionTypeCategory === 'html'" class="html-editor">
                  <div class="editor-subtabs">
                    <button [class.active]="activeCodeTab === 'html'" 
                            (click)="activeCodeTab = 'html'">HTML</button>
                    <button [class.active]="activeCodeTab === 'css'" 
                            (click)="activeCodeTab = 'css'">CSS</button>
                    <button [class.active]="activeCodeTab === 'js'" 
                            (click)="activeCodeTab = 'js'">JavaScript</button>
                  </div>

                  <div class="code-editor-container">
                    <textarea *ngIf="activeCodeTab === 'html'"
                              [(ngModel)]="currentInteraction.htmlCode"
                              (ngModelChange)="markChanged()"
                              class="code-textarea"
                              placeholder="<div>Your HTML here</div>"
                              spellcheck="false"></textarea>

                    <textarea *ngIf="activeCodeTab === 'css'"
                              [(ngModel)]="currentInteraction.cssCode"
                              (ngModelChange)="markChanged()"
                              class="code-textarea"
                              placeholder=".your-class { color: blue; }"
                              spellcheck="false"></textarea>

                    <textarea *ngIf="activeCodeTab === 'js'"
                              [(ngModel)]="currentInteraction.jsCode"
                              (ngModelChange)="markChanged()"
                              class="code-textarea"
                              placeholder="// Your JavaScript code"
                              spellcheck="false"></textarea>
                  </div>
                </div>

                <!-- PixiJS Type Code Editor -->
                <div *ngIf="currentInteraction.interactionTypeCategory === 'pixijs'" class="pixijs-editor">
                  <p class="editor-note">
                    💡 For PixiJS interactions, write a single TypeScript/JavaScript file that exports your interaction.
                  </p>
                  <div class="code-editor-container">
                    <textarea [(ngModel)]="currentInteraction.jsCode"
                              (ngModelChange)="markChanged()"
                              class="code-textarea"
                              placeholder="// PixiJS TypeScript code
import * as PIXI from 'pixi.js';

export class MyPixiInteraction {
  constructor(container, data) {
    // Your PixiJS code here
  }
}"
                              spellcheck="false"></textarea>
                  </div>
                </div>

                <!-- iFrame Type Configuration -->
                <div *ngIf="currentInteraction.interactionTypeCategory === 'iframe'" class="iframe-config">
                  <div class="form-group">
                    <label>iFrame URL *</label>
                    <input type="url" 
                           [(ngModel)]="currentInteraction.iframeUrl"
                           (ngModelChange)="markChanged()"
                           placeholder="https://example.com/embed" />
                    <small class="hint">The URL to embed in an iframe</small>
                  </div>

                  <div class="form-group">
                    <label>iFrame Configuration (JSON)</label>
                    <textarea [(ngModel)]="iframeConfigText"
                              (ngModelChange)="onIframeConfigChange()"
                              class="code-textarea"
                              rows="6"
                              placeholder='{ "width": "100%", "height": "600px", "allow": "fullscreen" }'
                              spellcheck="false"></textarea>
                    <small class="hint">Optional: width, height, allow permissions, etc.</small>
                  </div>
                </div>

                <div *ngIf="!currentInteraction.interactionTypeCategory" class="no-type-selected">
                  <p>⚠️ Please select an interaction type in the Settings tab first.</p>
                </div>

                <!-- Test Button and Save -->
                <div *ngIf="currentInteraction?.interactionTypeCategory" class="code-actions">
                  <button (click)="testCode()" class="btn-test" [disabled]="testing">
                    {{ testing ? '⏳ Testing...' : '🧪 Test Code' }}
                  </button>
                  <button (click)="saveInteraction()" class="btn-save-inline" [disabled]="saving">
                    {{ saving ? '⏳ Saving...' : '💾 Save' }}
                  </button>
                </div>
                <div *ngIf="testResult" class="test-result" [class.success]="testResult.success" [class.error]="!testResult.success">
                  <button (click)="testResult = null" class="close-test-result" title="Close">✕</button>
                  <div class="result-icon">{{ testResult.success ? '✅' : '❌' }}</div>
                  <div class="result-content">
                    <div class="result-message">{{ testResult.message }}</div>
                    <pre *ngIf="testResult.error" class="error-details">{{testResult.error}}</pre>
                  </div>
                </div>
              </div>
            </div>

            <!-- Config Schema Tab -->
            <div *ngIf="activeTab === 'config'" class="tab-content">
              <div class="config-schema-section">
                <div class="section-header">
                  <h3>Configuration Schema</h3>
                  <p class="hint">Define what lesson-builders can configure when using this interaction</p>
                </div>

                <div class="form-group">
                  <label>Config Schema (JSON)</label>
                  <textarea [(ngModel)]="configSchemaText"
                            (ngModelChange)="onConfigSchemaChange()"
                            class="code-textarea"
                            rows="20"
                            placeholder='Example for True/False interaction:
{
  "fields": [
    {
      "key": "statements",
      "label": "True/False Statements",
      "type": "array",
      "itemType": "object",
      "itemSchema": {
        "statement": { "type": "string", "label": "Statement" },
        "isTrue": { "type": "boolean", "label": "Is True?" }
      }
    },
    {
      "key": "shuffleStatements",
      "label": "Shuffle Statements",
      "type": "boolean",
      "default": true
    }
  ]
}'
                            spellcheck="false"></textarea>
                  <small class="hint">This defines the Configure modal that lesson-builders will see</small>
                </div>

                <div *ngIf="configSchemaError" class="error-message">
                  ⚠️ Invalid JSON: {{configSchemaError}}
                </div>

                <div class="config-actions">
                  <button (click)="showConfigModal()" class="btn-secondary" [disabled]="!currentInteraction?.configSchema">
                    👁️ Preview Config Modal
                  </button>
                  <button (click)="saveInteraction()" class="btn-save-inline" [disabled]="saving || configSchemaError">
                    {{ saving ? '⏳ Saving...' : '💾 Save' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Sample Data Tab -->
            <div *ngIf="activeTab === 'sample'" class="tab-content">
              <div class="sample-data-section">
                <div class="section-header">
                  <h3>Sample Data</h3>
                  <p class="hint">Provide sample JSON data to test your interaction in the Preview tab</p>
                </div>

                <div class="form-group">
                  <label>Sample Input Data (JSON)</label>
                  <textarea [(ngModel)]="sampleDataText"
                            (ngModelChange)="onSampleDataChange()"
                            class="code-textarea"
                            rows="20"
                            placeholder='Example for True/False interaction:
{
  "fragments": [
    {
      "id": "1",
      "statement": "The sun rises in the east",
      "isTrue": true
    },
    {
      "id": "2",
      "statement": "Water boils at 50°C",
      "isTrue": false
    }
  ],
  "shuffleStatements": true
}'
                            spellcheck="false"></textarea>
                  <small class="hint">This data will be passed to your interaction for testing</small>
                </div>

                <div *ngIf="sampleDataError" class="error-message">
                  ⚠️ Invalid JSON: {{sampleDataError}}
                </div>

                <div class="sample-actions">
                  <button (click)="saveInteraction()" class="btn-save-inline" [disabled]="saving || sampleDataError">
                    {{ saving ? '⏳ Saving...' : '💾 Save' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Preview Tab -->
            <div *ngIf="activeTab === 'preview'" class="tab-content">
              <div class="preview-section">
                <div class="section-header">
                  <h3>Live Preview</h3>
                  <p class="hint">See how your interaction looks with the sample data</p>
                  <button (click)="refreshPreview()" class="btn-refresh" style="margin-top: 0.5rem;">
                    🔄 Refresh Preview
                  </button>
                </div>

                <div class="preview-container" [attr.data-preview-key]="previewKey">
                  <!-- HTML Preview (prioritize this for HTML types) -->
                  <div *ngIf="currentInteraction?.interactionTypeCategory === 'html' && currentInteraction?.htmlCode" class="html-preview">
                    <div [innerHTML]="getHtmlPreview()"></div>
                  </div>

                  <!-- iFrame Preview -->
                  <div *ngIf="currentInteraction?.interactionTypeCategory === 'iframe' && currentInteraction?.iframeUrl" class="iframe-preview">
                    <iframe [src]="getSafeIframeUrl()" 
                            [style.width]="getIframeWidth()"
                            [style.height]="getIframeHeight()"
                            frameborder="0"></iframe>
                  </div>

                  <!-- PixiJS Preview Placeholder -->
                  <div *ngIf="currentInteraction?.interactionTypeCategory === 'pixijs'" class="pixijs-preview-placeholder">
                    <div class="placeholder-content">
                      <span class="placeholder-icon">🎮</span>
                      <h4>PixiJS Preview</h4>
                      <p>Live PixiJS preview coming soon. For now, test in a lesson.</p>
                    </div>
                  </div>

                  <!-- Fallback: Use Angular component for true-false-selection if no HTML code -->
                  <div *ngIf="currentInteraction?.id === 'true-false-selection' && !currentInteraction?.htmlCode && currentInteraction?.sampleData" class="interaction-preview">
                    <app-true-false-selection 
                      [data]="currentInteraction?.sampleData"
                      (interactionComplete)="onPreviewComplete($event)">
                    </app-true-false-selection>
                  </div>

                  <!-- No Preview Available -->
                  <div *ngIf="!canShowPreview()" class="no-preview">
                    <div class="placeholder-content">
                      <span class="placeholder-icon">👁️</span>
                      <h4>No Preview Available</h4>
                      <p *ngIf="!currentInteraction.sampleData">Add sample data in the "Sample Data" tab to see a preview.</p>
                      <p *ngIf="!currentInteraction.interactionTypeCategory">Select an interaction type in Settings.</p>
                      <p *ngIf="currentInteraction.interactionTypeCategory === 'html' && !currentInteraction.htmlCode">Add HTML code in the Code tab.</p>
                      <p *ngIf="currentInteraction.interactionTypeCategory === 'iframe' && !currentInteraction.iframeUrl">Add an iframe URL in the Code tab.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- AI Assistant (Floating) -->
      <div class="ai-assistant-widget" 
           [class.minimized]="aiMinimized" 
           [class.hidden]="aiHidden">
        <div *ngIf="aiMinimized" class="ai-icon-minimized" (click)="aiMinimized = false">
          <div class="avatar">🔧</div>
          <div *ngIf="aiTyping" class="speaking-indicator">...</div>
        </div>

        <div *ngIf="!aiMinimized" class="ai-card">
          <div class="ai-header">
            <div class="ai-avatar">
              <span class="avatar-emoji">🔧</span>
            </div>
            <div class="ai-title">AI Builder Assistant</div>
            <div class="header-controls">
              <button class="control-btn" (click)="aiMinimized = true" title="Minimize">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="7" width="10" height="2" rx="1"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="chat-history" #aiChatHistory>
            <div *ngIf="aiMessages.length === 0" class="no-messages">
              <span class="muted-text">Ask me anything about building interactions!</span>
            </div>
            <div *ngFor="let msg of aiMessages" 
                 [class.user-message]="msg.role === 'user'"
                 [class.ai-message]="msg.role === 'assistant'"
                 class="message">
              <div class="message-content">
                <div class="message-icon">{{ msg.role === 'user' ? '👤' : '🔧' }}</div>
                <div class="message-text">{{ msg.content }}</div>
              </div>
            </div>
            <div *ngIf="aiTyping" class="ai-message message">
              <div class="message-content">
                <div class="message-icon">🔧</div>
                <div class="message-text typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>

          <div class="chat-input-container">
            <textarea 
              [(ngModel)]="aiInput"
              (keydown.enter)="onAiEnter($any($event))"
              placeholder="Ask about HTML, PixiJS, config schemas..."
              rows="2"></textarea>
            <button (click)="sendAiMessage()" [disabled]="!aiInput.trim() || aiTyping" class="send-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10l16-8-8 16-2-8-6-0z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Shared Configure Modal Component -->
      <app-interaction-configure-modal
        [isOpen]="showingConfigModal"
        [interactionType]="currentInteraction?.id || ''"
        [interactionName]="currentInteraction?.name || ''"
        [configSchema]="currentInteraction?.configSchema"
        [sampleData]="currentInteraction?.sampleData"
        [initialConfig]="{}"
        (closed)="closeConfigModal()"
        (saved)="onConfigModalSaved($event)">
      </app-interaction-configure-modal>

      <!-- Success Snackbar -->
      <div *ngIf="showSnackbar" class="snackbar">
        {{ snackbarMessage }}
      </div>
    </div>
  `,
  styles: [`
    .interaction-builder {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #0a0a0a;
      color: #ffffff;
    }

    .builder-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: #1a1a1a;
      border-bottom: 1px solid #333;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .builder-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      flex: 1;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-icon {
      background: transparent;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.375rem;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: #2a2a2a;
      color: #fff;
    }

    .btn-icon svg {
      width: 1.5rem;
      height: 1.5rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #2a2a2a;
      color: white;
      border: 1px solid #444;
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #333;
      border-color: #555;
    }

    .builder-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Sidebar */
    .interaction-library {
      width: 320px;
      background: #1a1a1a;
      border-right: 1px solid #333;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .library-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #333;
    }

    .library-header h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .btn-small {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
    }

    /* Search & Filter */
    .library-filters {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #333;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      color: #666;
      pointer-events: none;
    }

    .search-box input {
      width: 100%;
      padding: 0.5rem 2rem 0.5rem 2.5rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.375rem;
      color: #fff;
      font-size: 0.875rem;
    }

    .search-box input:focus {
      outline: none;
      border-color: #667eea;
    }

    .clear-search {
      position: absolute;
      right: 0.5rem;
      background: transparent;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      border-radius: 0.25rem;
    }

    .clear-search:hover {
      background: #2a2a2a;
      color: #999;
    }

    .type-filter select {
      width: 100%;
      padding: 0.5rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.375rem;
      color: #fff;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .type-filter select:focus {
      outline: none;
      border-color: #667eea;
    }

    .interactions-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .interaction-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .interaction-item:hover {
      background: #1a1a1a;
      border-color: #444;
    }

    .interaction-item.active {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
      border-color: #667eea;
    }

    .interaction-icon {
      font-size: 1.5rem;
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
      border-radius: 0.5rem;
    }

    .interaction-item.active .interaction-icon {
      background: rgba(102, 126, 234, 0.2);
    }

    .interaction-info {
      flex: 1;
      min-width: 0;
    }

    .interaction-name {
      font-weight: 500;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .interaction-type {
      font-size: 0.75rem;
      color: #999;
      margin-top: 0.125rem;
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: #666;
      font-size: 0.875rem;
    }

    /* Main Content */
    .builder-main {
      flex: 1;
      overflow-y: auto;
      background: #0a0a0a;
    }

    .empty-builder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-builder h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      color: #999;
    }

    .empty-builder p {
      margin: 0;
      font-size: 1rem;
    }

    .editor-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Main Tabs */
    .editor-tabs-main {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #333;
      padding-bottom: 0.5rem;
    }

    .editor-tabs-main button {
      background: transparent;
      border: none;
      color: #999;
      padding: 0.75rem 1rem;
      cursor: pointer;
      font-weight: 500;
      border-radius: 0.375rem 0.375rem 0 0;
      transition: all 0.2s;
    }

    .editor-tabs-main button:hover {
      color: #fff;
      background: #1a1a1a;
    }

    .editor-tabs-main button.active {
      color: #fff;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
      border-bottom: 2px solid #667eea;
    }

    .tab-content {
      animation: fadeIn 0.2s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Form Styles */
    .info-section, .code-section, .config-schema-section, .sample-data-section, .preview-section {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .section-header {
      margin-bottom: 1.5rem;
    }

    .section-header h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .section-header .hint {
      color: #999;
      font-size: 0.875rem;
      margin: 0;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
    }

    .form-group label {
      font-weight: 500;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      padding: 0.625rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.375rem;
      color: #fff;
      font-family: inherit;
      font-size: 0.875rem;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-group input:disabled,
    .form-group select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .form-group .hint {
      font-size: 0.75rem;
      color: #666;
      margin-top: 0.25rem;
    }

    /* Code Editor */
    .editor-subtabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .editor-subtabs button {
      background: #0a0a0a;
      border: 1px solid #333;
      color: #999;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      transition: all 0.2s;
    }

    .editor-subtabs button:hover {
      border-color: #444;
      color: #fff;
    }

    .editor-subtabs button.active {
      background: #667eea;
      border-color: #667eea;
      color: #fff;
    }

    .code-editor-container {
      position: relative;
    }

    .code-textarea {
      width: 100%;
      min-height: 400px;
      padding: 1rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      color: #fff;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      resize: vertical;
    }

    .code-textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .editor-note {
      background: rgba(102, 126, 234, 0.1);
      border-left: 3px solid #667eea;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    .no-type-selected {
      text-align: center;
      padding: 3rem 1rem;
      color: #999;
    }

    .no-type-selected p {
      margin: 0;
    }

    /* Code Actions */
    .code-actions,
    .config-actions,
    .sample-actions,
    .settings-actions {
      margin-top: 1.5rem;
      padding: 1rem;
      background: rgba(102, 126, 234, 0.05);
      border: 1px solid #333;
      border-radius: 0.5rem;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .btn-test {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-test:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-1px);
    }

    .btn-test:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-save-inline {
      background: #00d4ff;
      color: #0f0f23;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0, 212, 255, 0.3);
    }

    .btn-save-inline:hover:not(:disabled) {
      background: #00bce6;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.5);
    }

    .btn-save-inline:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-refresh {
      background: #10b981;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    .test-result {
      margin-top: 1rem;
      padding: 1rem 1rem 1rem 1rem;
      border-radius: 0.5rem;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      position: relative;
    }

    .close-test-result {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: transparent;
      border: none;
      color: #999;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      line-height: 1;
      border-radius: 0.25rem;
      transition: all 0.2s;
    }

    .close-test-result:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .test-result.success {
      background: rgba(76, 175, 80, 0.1);
      border: 1px solid #4caf50;
    }

    .test-result.error {
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid #f44336;
    }

    .result-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .result-content {
      flex: 1;
    }

    .result-message {
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .error-details {
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      color: #f44336;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* Config & Sample */
    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #ef4444;
      padding: 0.75rem 1rem;
      margin-top: 1rem;
      border-radius: 0.375rem;
      color: #ef4444;
      font-size: 0.875rem;
    }

    .config-preview-btn {
      margin-top: 1rem;
      display: flex;
      justify-content: center;
    }

    /* Preview */
    .preview-container {
      min-height: 400px;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 1.5rem;
    }

    .interaction-preview,
    .html-preview,
    .iframe-preview {
      width: 100%;
    }

    .iframe-preview iframe {
      border: 1px solid #333;
      border-radius: 0.5rem;
    }

    .pixijs-preview-placeholder,
    .no-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
    }

    .placeholder-content {
      text-align: center;
      color: #666;
    }

    .placeholder-icon {
      font-size: 4rem;
      display: block;
      margin-bottom: 1rem;
    }

    .placeholder-content h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      color: #999;
    }

    .placeholder-content p {
      margin: 0.25rem 0;
      font-size: 0.875rem;
    }

    /* AI Assistant Widget */
    .ai-assistant-widget {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 1000;
      transition: all 0.3s ease;
    }

    .ai-assistant-widget.hidden {
      display: none;
    }

    .ai-icon-minimized {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.2s;
      position: relative;
    }

    .ai-icon-minimized:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    .ai-icon-minimized .avatar {
      font-size: 1.75rem;
    }

    .speaking-indicator {
      position: absolute;
      bottom: -5px;
      right: -5px;
      background: #10b981;
      color: white;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: bold;
    }

    .ai-card {
      width: 400px;
      max-height: 600px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 1rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .ai-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
      border-bottom: 1px solid #333;
    }

    .ai-avatar {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .ai-title {
      flex: 1;
      font-weight: 600;
      font-size: 1rem;
    }

    .header-controls {
      display: flex;
      gap: 0.5rem;
    }

    .control-btn {
      background: transparent;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      border-radius: 0.25rem;
      transition: all 0.2s;
    }

    .control-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .chat-history {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .no-messages {
      text-align: center;
      padding: 2rem 1rem;
      color: #666;
      font-size: 0.875rem;
    }

    .message {
      display: flex;
      animation: slideIn 0.2s ease;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .user-message {
      justify-content: flex-end;
    }

    .user-message .message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 1rem 1rem 0 1rem;
    }

    .ai-message .message-content {
      background: #2a2a2a;
      border-radius: 1rem 1rem 1rem 0;
    }

    .message-content {
      max-width: 80%;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .message-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .message-text {
      flex: 1;
      font-size: 0.875rem;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 0.5rem 0;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #667eea;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }

    .typing-indicator span:nth-child(1) {
      animation-delay: -0.32s;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: -0.16s;
    }

    @keyframes bounce {
      0%, 80%, 100% { 
        transform: scale(0);
      } 
      40% { 
        transform: scale(1);
      }
    }

    .chat-input-container {
      padding: 1rem;
      border-top: 1px solid #333;
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;
    }

    .chat-input-container textarea {
      flex: 1;
      padding: 0.625rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      color: #fff;
      font-family: inherit;
      font-size: 0.875rem;
      resize: none;
      max-height: 100px;
    }

    .chat-input-container textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .send-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.2s ease;
    }

    .modal-overlay-fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }

    .modal-container-fullscreen {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 1rem;
      width: 95%;
      max-width: 1200px;
      height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    .modal-header-sticky {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #333;
      background: #1a1a1a;
    }

    .modal-header-sticky h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .modal-tabs {
      display: flex;
      gap: 0.5rem;
      padding: 0 1.5rem;
      border-bottom: 1px solid #333;
      background: #1a1a1a;
    }

    .modal-tab {
      background: transparent;
      border: none;
      color: #999;
      padding: 1rem 1.5rem;
      cursor: pointer;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .modal-tab:hover {
      color: #fff;
    }

    .modal-tab.active {
      color: #00d4ff;
      border-bottom-color: #00d4ff;
    }

    .modal-body-scrollable {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      background: #0a0a0a;
    }

    .modal-footer-sticky {
      padding: 1rem 1.5rem;
      border-top: 1px solid #333;
      background: #1a1a1a;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .config-tab-content,
    .preview-tab-content {
      animation: fadeIn 0.2s ease;
    }

    .interaction-preview-fullscreen {
      min-height: 400px;
    }

    .modal-content {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 1rem;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s ease;
    }

    .modal-content.large-modal {
      max-width: 900px;
      max-height: 90vh;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #333;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      border-radius: 0.25rem;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #2a2a2a;
      color: #fff;
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .modal-note {
      background: rgba(102, 126, 234, 0.1);
      border-left: 3px solid #667eea;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    .config-form-preview {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .config-form-preview pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 0.875rem;
      color: #999;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .config-form-preview .hint {
      margin-top: 1rem;
      color: #666;
      font-size: 0.875rem;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #333;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .config-section,
    .preview-section-modal {
      margin-bottom: 2rem;
    }

    .config-section h3,
    .preview-section-modal h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
      color: #00d4ff;
    }

    .modal-preview-container {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 1rem;
      min-height: 300px;
    }

    .no-sample-data {
      text-align: center;
      padding: 2rem;
      color: #ffc107;
    }

    /* Hide mobile-only elements on desktop */
    .mobile-only {
      display: none;
    }

    /* Mobile Responsiveness */
    @media (max-width: 1024px) {
      .interaction-library {
        width: 280px;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .ai-card {
        width: 340px;
      }
    }

    @media (max-width: 768px) {
      .mobile-only {
        display: block !important;
      }

      .builder-layout {
        position: relative;
        flex-direction: row;
      }

      .interaction-library {
        position: fixed;
        left: 0;
        top: 64px;
        bottom: 0;
        width: 80%;
        max-width: 320px;
        height: auto;
        max-height: none;
        border-right: 1px solid #333;
        border-bottom: none;
        z-index: 200;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
      }

      .interaction-library:not(.mobile-hidden) {
        transform: translateX(0);
      }

      .builder-main {
        width: 100%;
        margin-left: 0;
      }

      .editor-container {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 64px);
        padding: 0;
      }

      .editor-tabs-main {
        position: sticky;
        bottom: 0;
        z-index: 50;
        background: #0a0a0a;
        border-top: 1px solid #333;
        border-bottom: none;
        margin-bottom: 0;
        padding: 0.5rem;
        display: grid;
        grid-template-columns: auto 1fr 1fr 1fr;
        grid-template-rows: auto auto;
        gap: 0.375rem;
        order: 2;
      }

      .sidebar-toggle {
        grid-column: 1;
        grid-row: 1 / 3;
        background: #667eea;
        color: white;
        border: none;
        padding: 0.5rem;
        border-radius: 0.375rem;
        font-size: 0.7rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .editor-tabs-main button:not(.sidebar-toggle) {
        padding: 0.5rem 0.375rem;
        font-size: 0.7rem;
        text-align: center;
      }

      .editor-tabs-main button:nth-child(2) { grid-column: 2; grid-row: 1; }
      .editor-tabs-main button:nth-child(3) { grid-column: 3; grid-row: 1; }
      .editor-tabs-main button:nth-child(4) { grid-column: 4; grid-row: 1; }
      .editor-tabs-main button:nth-child(5) { grid-column: 2; grid-row: 2; }
      .editor-tabs-main button:nth-child(6) { grid-column: 3; grid-row: 2; }

      .tab-content {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        order: 1;
      }

      .ai-assistant-widget {
        bottom: 60px;
        right: 1rem;
      }

      .ai-card {
        width: calc(100vw - 2rem);
        max-width: 400px;
      }

      .interaction-library {
        z-index: 300 !important;
      }
    }

    /* Snackbar */
    .snackbar {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a1a;
      color: #fff;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      border: 1px solid #333;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 5000;
      animation: slideUp 0.3s ease;
      font-weight: 500;
    }

    .empty-builder-inline {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      color: #666;
    }

    .empty-builder-inline .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-builder-inline h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      color: #999;
    }

    .empty-builder-inline p {
      margin: 0;
      font-size: 1rem;
    }
  `]
})
export class InteractionBuilderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  interactions: InteractionType[] = [];
  filteredInteractions: InteractionType[] = [];
  currentInteraction: InteractionType | null = null;
  isNewInteraction = false;
  hasChanges = false;
  saving = false;

  // Filters
  searchQuery = '';
  typeFilter = '';

  // Mobile sidebar
  sidebarHidden = false;

  // Tabs
  activeTab: 'settings' | 'code' | 'config' | 'sample' | 'preview' = 'settings';
  activeCodeTab: 'html' | 'css' | 'js' = 'html';

  // JSON text fields (for editing)
  iframeConfigText = '';
  configSchemaText = '';
  sampleDataText = '';
  configSchemaError = '';
  sampleDataError = '';

  // AI Assistant
  aiMinimized = true;
  aiHidden = false;
  aiTyping = false;
  aiInput = '';
  aiMessages: ChatMessage[] = [];

  // Modal
  showingConfigModal = false;

  // Testing
  testing = false;
  testResult: { success: boolean; message: string; error?: string } | null = null;

  // Reset functionality
  lastWorkingVersion: InteractionType | null = null;
  hasLastWorking = false;

  // Preview refresh
  previewKey = Date.now();

  // Snackbar
  showSnackbar = false;
  snackbarMessage = '';

  @ViewChild('aiChatHistory') aiChatHistory?: ElementRef;

  constructor(
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadInteractions();
    
    // Start with sidebar hidden on mobile
    if (window.innerWidth <= 768) {
      this.sidebarHidden = true;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInteractions() {
    this.http.get<InteractionType[]>(`${environment.apiUrl}/interaction-types`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.interactions = data;
          this.filterInteractions();
        },
        error: (err) => {
          console.error('Failed to load interactions:', err);
        }
      });
  }

  filterInteractions() {
    let filtered = [...this.interactions];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        i.name.toLowerCase().includes(query) || 
        i.description?.toLowerCase().includes(query) ||
        i.id.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (this.typeFilter) {
      if (this.typeFilter === 'legacy') {
        filtered = filtered.filter(i => !i.interactionTypeCategory);
      } else {
        filtered = filtered.filter(i => i.interactionTypeCategory === this.typeFilter);
      }
    }

    this.filteredInteractions = filtered;
  }

  loadInteraction(interaction: InteractionType) {
    if (this.hasChanges && !confirm('You have unsaved changes. Discard them?')) {
      return;
    }

    console.log('[InteractionBuilder] 📥 Loading interaction:', interaction.id);

    this.currentInteraction = { ...interaction };
    this.isNewInteraction = false;
    this.hasChanges = false;
    this.activeTab = 'settings';
    this.testResult = null;

    // Load JSON fields into text areas
    this.iframeConfigText = interaction.iframeConfig ? JSON.stringify(interaction.iframeConfig, null, 2) : '';
    this.configSchemaText = interaction.configSchema ? JSON.stringify(interaction.configSchema, null, 2) : '';
    this.sampleDataText = interaction.sampleData ? JSON.stringify(interaction.sampleData, null, 2) : '';

    // Store as last working version if it has code
    if (interaction.htmlCode || interaction.jsCode || interaction.iframeUrl) {
      this.lastWorkingVersion = JSON.parse(JSON.stringify(interaction));
      this.hasLastWorking = true;
      console.log('[InteractionBuilder] ✅ Stored as last working version');
    }

    console.log('[InteractionBuilder] 📝 Config Schema Text:', this.configSchemaText.substring(0, 50) + '...');
    console.log('[InteractionBuilder] 📝 Sample Data Text:', this.sampleDataText.substring(0, 50) + '...');
  }

  createNew() {
    if (this.hasChanges && !confirm('You have unsaved changes. Discard them?')) {
      return;
    }

    this.currentInteraction = {
      id: '',
      name: '',
      description: '',
      interactionTypeCategory: undefined,
      isActive: true
    };
    this.isNewInteraction = true;
    this.hasChanges = true;
    this.activeTab = 'settings';
    this.iframeConfigText = '';
    this.configSchemaText = '';
    this.sampleDataText = '';
  }

  markChanged() {
    this.hasChanges = true;
  }

  onTypeChange() {
    this.markChanged();
    // Reset type-specific fields when type changes
    if (this.currentInteraction) {
      if (this.currentInteraction.interactionTypeCategory !== 'html') {
        this.currentInteraction.htmlCode = undefined;
        this.currentInteraction.cssCode = undefined;
      }
      if (this.currentInteraction.interactionTypeCategory !== 'iframe') {
        this.currentInteraction.iframeUrl = undefined;
        this.currentInteraction.iframeConfig = undefined;
        this.iframeConfigText = '';
      }
      if (this.currentInteraction.interactionTypeCategory !== 'pixijs') {
        // PixiJS uses jsCode
      }
    }
  }

  onIframeConfigChange() {
    this.markChanged();
    if (!this.iframeConfigText.trim()) {
      this.currentInteraction!.iframeConfig = undefined;
      return;
    }

    try {
      this.currentInteraction!.iframeConfig = JSON.parse(this.iframeConfigText);
    } catch (e: any) {
      // Keep as text for now, will validate on save
    }
  }

  onConfigSchemaChange() {
    this.markChanged();
    this.configSchemaError = '';
    
    if (!this.configSchemaText.trim()) {
      this.currentInteraction!.configSchema = undefined;
      return;
    }

    try {
      this.currentInteraction!.configSchema = JSON.parse(this.configSchemaText);
    } catch (e: any) {
      this.configSchemaError = e.message;
    }
  }

  onSampleDataChange() {
    this.markChanged();
    this.sampleDataError = '';
    
    if (!this.sampleDataText.trim()) {
      this.currentInteraction!.sampleData = undefined;
      return;
    }

    try {
      this.currentInteraction!.sampleData = JSON.parse(this.sampleDataText);
    } catch (e: any) {
      this.sampleDataError = e.message;
    }
  }

  saveInteraction() {
    if (!this.currentInteraction) return;

    // Validate required fields
    if (!this.currentInteraction.id || !this.currentInteraction.name || !this.currentInteraction.description) {
      alert('Please fill in all required fields (ID, Name, Description)');
      return;
    }

    if (!this.currentInteraction.interactionTypeCategory) {
      alert('Please select an interaction type');
      return;
    }

    // Validate JSON fields
    if (this.configSchemaError) {
      alert('Please fix the Config Schema JSON error before saving');
      return;
    }
    if (this.sampleDataError) {
      alert('Please fix the Sample Data JSON error before saving');
      return;
    }

    this.saving = true;
    const endpoint = this.isNewInteraction 
      ? `${environment.apiUrl}/interaction-types`
      : `${environment.apiUrl}/interaction-types/${this.currentInteraction.id}`;

    const request$ = this.isNewInteraction
      ? this.http.post<InteractionType>(endpoint, this.currentInteraction)
      : this.http.put<InteractionType>(endpoint, this.currentInteraction);
    
    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (saved) => {
          console.log('Saved interaction:', saved);
          this.hasChanges = false;
          this.saving = false;
          this.isNewInteraction = false;
          
          // Reload list
          this.loadInteractions();
          
          // Update current
          this.currentInteraction = saved;
          
          // Show success snackbar
          this.showSuccessSnackbar('✅ Saved successfully!');
        },
        error: (err) => {
          console.error('Failed to save interaction:', err);
          this.showSuccessSnackbar('❌ Save failed: ' + (err.error?.message || err.message));
          this.saving = false;
        }
      });
  }

  showSuccessSnackbar(message: string) {
    this.snackbarMessage = message;
    this.showSnackbar = true;
    setTimeout(() => {
      this.showSnackbar = false;
    }, 3000);
  }

  switchTab(tab: 'settings' | 'code' | 'config' | 'sample' | 'preview') {
    if (!this.currentInteraction) {
      this.showSuccessSnackbar('⚠️ You must select or create an interaction first');
      return;
    }
    this.activeTab = tab;
  }

  getTypeLabel(type?: string): string {
    if (!type) return 'Legacy';
    switch (type) {
      case 'html': return 'HTML';
      case 'pixijs': return 'PixiJS';
      case 'iframe': return 'iFrame';
      default: return 'Unknown';
    }
  }

  canShowPreview(): boolean {
    if (!this.currentInteraction) return false;
    
    if (this.currentInteraction.id === 'true-false-selection' && this.currentInteraction.sampleData) {
      return true;
    }
    
    if (this.currentInteraction.interactionTypeCategory === 'html' && this.currentInteraction.htmlCode) {
      return true;
    }
    
    if (this.currentInteraction.interactionTypeCategory === 'iframe' && this.currentInteraction.iframeUrl) {
      return true;
    }
    
    if (this.currentInteraction.interactionTypeCategory === 'pixijs') {
      return true; // Show placeholder
    }
    
    return false;
  }

  getHtmlPreview(): SafeHtml {
    if (!this.currentInteraction) {
      console.log('[Preview] ⚠️ No current interaction');
      return '';
    }
    
    console.log('[Preview] 🎬 Generating HTML preview...');
    console.log('[Preview] Has HTML:', !!this.currentInteraction.htmlCode);
    console.log('[Preview] Has CSS:', !!this.currentInteraction.cssCode);
    console.log('[Preview] Has JS:', !!this.currentInteraction.jsCode);
    console.log('[Preview] Has Sample Data:', !!this.currentInteraction.sampleData);
    
    let html = '';
    
    // Add CSS
    if (this.currentInteraction.cssCode) {
      html += `<style>${this.currentInteraction.cssCode}</style>`;
    }
    
    // Add HTML
    html += this.currentInteraction.htmlCode || '';
    
    // Inject sample data as window variable and add JS
    if (this.currentInteraction.jsCode) {
      const sampleDataJson = this.currentInteraction.sampleData ? 
        JSON.stringify(this.currentInteraction.sampleData) : '{}';
      console.log('[Preview] 📋 Sample data being injected:', sampleDataJson.substring(0, 100) + '...');
      html += `<script>
        console.log('[Interaction Preview] 🎯 Loading with data:', window.interactionData);
        window.interactionData = ${sampleDataJson};
        console.log('[Interaction Preview] 📋 Sample data set:', window.interactionData);
        ${this.currentInteraction.jsCode}
        console.log('[Interaction Preview] ✅ JavaScript executed');
      </script>`;
    }
    
    console.log('[Preview] ✅ HTML preview generated, length:', html.length);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  getSafeIframeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.currentInteraction?.iframeUrl || '');
  }

  getIframeWidth(): string {
    return this.currentInteraction?.iframeConfig?.width || '100%';
  }

  getIframeHeight(): string {
    return this.currentInteraction?.iframeConfig?.height || '600px';
  }

  onPreviewComplete(result: any) {
    console.log('Preview interaction completed:', result);
  }

  showConfigModal() {
    this.refreshPreview(); // Ensure sample data is current
    this.showingConfigModal = true;
    console.log('[InteractionBuilder] 👁️ Opening config modal');
  }

  closeConfigModal() {
    this.showingConfigModal = false;
  }

  onConfigModalSaved(config: any) {
    console.log('[InteractionBuilder] 💾 Config modal saved:', config);
    this.showingConfigModal = false;
  }

  // AI Assistant methods
  onAiEnter(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendAiMessage();
    }
  }

  sendAiMessage() {
    const message = this.aiInput.trim();
    if (!message || this.aiTyping) return;

    this.aiMessages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    this.aiInput = '';
    this.aiTyping = true;

    // Scroll to bottom
    setTimeout(() => {
      if (this.aiChatHistory) {
        this.aiChatHistory.nativeElement.scrollTop = this.aiChatHistory.nativeElement.scrollHeight;
      }
    }, 100);

    // TODO: Call actual AI API (Grok)
    // For now, placeholder response
    setTimeout(() => {
      this.aiMessages.push({
        role: 'assistant',
        content: this.getAiResponse(message),
        timestamp: new Date()
      });
      this.aiTyping = false;

      // Scroll to bottom
      setTimeout(() => {
        if (this.aiChatHistory) {
          this.aiChatHistory.nativeElement.scrollTop = this.aiChatHistory.nativeElement.scrollHeight;
        }
      }, 100);
    }, 1500);
  }

  getAiResponse(userMessage: string): string {
    const lower = userMessage.toLowerCase();
    
    if (lower.includes('html') || lower.includes('css')) {
      return 'For HTML interactions, you can use standard HTML5, CSS3, and vanilla JavaScript. The HTML code will be rendered in a sandboxed environment. You can access the interaction data via a global `interactionData` variable.';
    }
    
    if (lower.includes('pixijs') || lower.includes('pixi')) {
      return 'PixiJS interactions should export a class with a constructor that takes (container, data). You can import PIXI and create your interactive graphics. The container is a DOM element where your PixiJS canvas will be mounted.';
    }
    
    if (lower.includes('iframe')) {
      return 'For iFrame interactions, simply provide the URL you want to embed. You can configure the width, height, and permissions in the iframe config JSON.';
    }
    
    if (lower.includes('config') || lower.includes('schema')) {
      return 'The config schema defines what lesson-builders can customize. Use JSON to define fields with types like "string", "number", "boolean", "array", etc. Each field should have a key, label, and type.';
    }
    
    if (lower.includes('sample') || lower.includes('preview')) {
      return 'Sample data should match the format your interaction expects. For example, a true/false interaction might expect { "fragments": [...] }. This data is used in the Preview tab to test your interaction.';
    }
    
    return 'I can help you with HTML, PixiJS, iFrame interactions, config schemas, and sample data. What would you like to know?';
  }

  testCode() {
    this.testing = true;
    this.testResult = null;
    console.log('[InteractionBuilder] 🧪 Testing code...');

    // Small delay for UX
    setTimeout(() => {
      try {
        if (this.currentInteraction?.interactionTypeCategory === 'html') {
          if (!this.currentInteraction.htmlCode || this.currentInteraction.htmlCode.trim() === '') {
            throw new Error('HTML code is required');
          }

          // Check for common attribute typos FIRST (before parsing)
          const htmlCode = this.currentInteraction.htmlCode;
          const typoPatterns = [
            { pattern: /\bclas=/gi, error: 'HTML typo: "clas=" should be "class="' },
            { pattern: /\bclasss=/gi, error: 'HTML typo: "classs=" should be "class="' },
            { pattern: /\bcladss=/gi, error: 'HTML typo: "cladss=" should be "class="' },
            { pattern: /\bclss=/gi, error: 'HTML typo: "clss=" should be "class="' },
            { pattern: /\bide=/gi, error: 'HTML typo: "ide=" should be "id="' },
            { pattern: /\bidd=/gi, error: 'HTML typo: "idd=" should be "id="' },
            { pattern: /\bdiv\s+[^>]*[^c]lass=/gi, error: 'Possible spacing issue in "class=" attribute' }
          ];

          for (const {pattern, error} of typoPatterns) {
            if (pattern.test(htmlCode)) {
              throw new Error(error);
            }
          }

          // Validate sample data is valid JSON
          let sampleData = {};
          if (this.sampleDataText.trim()) {
            try {
              sampleData = JSON.parse(this.sampleDataText);
              this.currentInteraction.sampleData = sampleData;
            } catch (jsonError: any) {
              throw new Error(`Sample data JSON error: ${jsonError.message}`);
            }
          }

          // ACTUAL TEST: Try to render in hidden container
          console.log('[Test] 🎬 Attempting to render preview...');
          const testContainer = document.createElement('div');
          testContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;height:600px;';
          document.body.appendChild(testContainer);

          try {
            // Add CSS
            let testHtml = '';
            if (this.currentInteraction.cssCode) {
              testHtml += `<style>${this.currentInteraction.cssCode}</style>`;
            }

            // Add HTML
            testHtml += this.currentInteraction.htmlCode;

            // Inject and execute
            testContainer.innerHTML = testHtml;

            // Execute JavaScript with sample data
            if (this.currentInteraction.jsCode) {
              const sampleDataJson = JSON.stringify(sampleData);
              const wrappedJs = `
                (function() {
                  try {
                    window.interactionData = ${sampleDataJson};
                    ${this.currentInteraction.jsCode}
                  } catch (e) {
                    throw new Error('Runtime error: ' + e.message);
                  }
                })();
              `;
              const scriptEl = document.createElement('script');
              scriptEl.textContent = wrappedJs;
              testContainer.appendChild(scriptEl);
            }

            // Check required elements actually exist in DOM
            if (this.currentInteraction.id === 'true-false-selection') {
              const fragmentsGrid = testContainer.querySelector('#fragmentsGrid') || 
                                   testContainer.querySelector('.fragments-grid');
              if (!fragmentsGrid) {
                throw new Error('Required element not found: fragmentsGrid');
              }

              const targetStatement = testContainer.querySelector('#targetStatement') ||
                                    testContainer.querySelector('.target-statement');
              if (!targetStatement) {
                throw new Error('Required element not found: targetStatement');
              }

              const submitBtn = testContainer.querySelector('#submitBtn') ||
                               testContainer.querySelector('.submit-btn');
              if (!submitBtn) {
                throw new Error('Required element not found: submitBtn');
              }

              console.log('[Test] ✅ All required elements found in DOM');
            }

            // Small delay to catch async errors
            setTimeout(() => {
              document.body.removeChild(testContainer);
              console.log('[Test] 🧹 Cleaned up test container');
            }, 100);

          } catch (renderError: any) {
            document.body.removeChild(testContainer);
            throw renderError;
          }

          // All checks passed - store as last working version
          this.lastWorkingVersion = JSON.parse(JSON.stringify(this.currentInteraction));
          this.hasLastWorking = true;

          this.testResult = {
            success: true,
            message: '✅ Code executed successfully! Preview renders without errors.'
          };
          console.log('[Test] ✅ All tests passed!');

        } else if (this.currentInteraction?.interactionTypeCategory === 'iframe') {
          if (!this.currentInteraction.iframeUrl) {
            throw new Error('iFrame URL is required');
          }

          try {
            new URL(this.currentInteraction.iframeUrl);
          } catch (urlError) {
            throw new Error('Invalid URL format');
          }

          this.lastWorkingVersion = JSON.parse(JSON.stringify(this.currentInteraction));
          this.hasLastWorking = true;

          this.testResult = {
            success: true,
            message: '✅ iFrame URL is valid!'
          };
        } else {
          throw new Error('Select an interaction type first');
        }
      } catch (error: any) {
        console.error('[Test] ❌ Test failed:', error);
        this.testResult = {
          success: false,
          message: 'Test failed',
          error: error.message || 'Unknown error'
        };
      } finally {
        this.testing = false;
      }
    }, 300);
  }

  resetToLastWorking() {
    if (!this.lastWorkingVersion || !confirm('Reset to last working version? Current changes will be lost.')) {
      return;
    }

    // Deep clone the last working version
    this.currentInteraction = JSON.parse(JSON.stringify(this.lastWorkingVersion));

    // Update text fields
    this.iframeConfigText = this.currentInteraction?.iframeConfig ? 
      JSON.stringify(this.currentInteraction.iframeConfig, null, 2) : '';
    this.configSchemaText = this.currentInteraction?.configSchema ? 
      JSON.stringify(this.currentInteraction.configSchema, null, 2) : '';
    this.sampleDataText = this.currentInteraction?.sampleData ? 
      JSON.stringify(this.currentInteraction.sampleData, null, 2) : '';

    this.hasChanges = false;
    this.testResult = null;
    this.refreshPreview();

    console.log('[InteractionBuilder] ✅ Reset to last working version');
  }

  refreshPreview() {
    // Force preview re-render by changing key
    this.previewKey = Date.now();
    console.log('[InteractionBuilder] 🔄 Preview refreshed');
    
    // Also update sample data from text field
    if (this.sampleDataText.trim()) {
      try {
        this.currentInteraction!.sampleData = JSON.parse(this.sampleDataText);
        console.log('[InteractionBuilder] ✅ Sample data updated for preview');
      } catch (e) {
        console.error('[InteractionBuilder] ❌ Sample data JSON invalid:', e);
      }
    }
  }

  toggleSidebar() {
    this.sidebarHidden = !this.sidebarHidden;
    console.log('[InteractionBuilder] 📚 Sidebar:', this.sidebarHidden ? 'hidden' : 'visible');
  }

  goBack() {
    if (this.hasChanges && !confirm('You have unsaved changes. Discard them?')) {
      return;
    }
    this.router.navigate(['/']);
  }
}

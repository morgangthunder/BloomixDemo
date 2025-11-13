import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LessonService } from '../../core/services/lesson.service';
import { environment } from '../../../environments/environment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
}

@Component({
  selector: 'app-interaction-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        <button (click)="saveInteraction()" class="btn-primary" [disabled]="saving">
          {{ saving ? 'Saving...' : 'Save Interaction' }}
        </button>
      </header>

      <div class="builder-layout">
        <!-- Sidebar: Interaction Library -->
        <aside class="interaction-library">
          <div class="library-header">
            <h2>Interactions</h2>
            <button (click)="createNew()" class="btn-small btn-primary">+ New</button>
          </div>
          
          <div class="interactions-list">
            <div *ngFor="let interaction of interactions" 
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

            <div *ngIf="interactions.length === 0" class="empty-state">
              No interactions yet. Click "New" to create one.
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="builder-main">
          <div *ngIf="!currentInteraction" class="empty-builder">
            <div class="empty-icon">🎯</div>
            <h2>Select an interaction to edit</h2>
            <p>Or create a new one to get started</p>
          </div>

          <div *ngIf="currentInteraction" class="editor-container">
            <!-- Basic Info -->
            <div class="info-section">
              <div class="form-row">
                <div class="form-group">
                  <label>Interaction ID *</label>
                  <input type="text" [(ngModel)]="currentInteraction.id" 
                         [disabled]="!isNewInteraction"
                         placeholder="e.g., my-custom-interaction" />
                  <small class="hint">Unique identifier (cannot be changed after creation)</small>
                </div>
                <div class="form-group">
                  <label>Name *</label>
                  <input type="text" [(ngModel)]="currentInteraction.name" 
                         placeholder="e.g., Drag and Drop Sorting" />
                </div>
              </div>

              <div class="form-group">
                <label>Description *</label>
                <textarea [(ngModel)]="currentInteraction.description" 
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
                  <select [(ngModel)]="currentInteraction.category">
                    <option value="">Optional...</option>
                    <option value="tease-trigger">Tease - Trigger</option>
                    <option value="explore-experiment">Explore - Experiment</option>
                    <option value="absorb-show">Absorb - Show</option>
                    <option value="cultivate-practice">Cultivate - Practice</option>
                    <option value="hone-apply">Hone - Apply</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Type-Specific Editors -->
            <div class="editor-section" *ngIf="currentInteraction.interactionTypeCategory">
              <!-- HTML Editor -->
              <div *ngIf="currentInteraction.interactionTypeCategory === 'html'" class="html-editor">
                <div class="editor-tabs">
                  <button [class.active]="activeCodeTab === 'html'" 
                          (click)="activeCodeTab = 'html'">HTML</button>
                  <button [class.active]="activeCodeTab === 'css'" 
                          (click)="activeCodeTab = 'css'">CSS</button>
                  <button [class.active]="activeCodeTab === 'js'" 
                          (click)="activeCodeTab = 'js'">JavaScript</button>
                  <button [class.active]="activeCodeTab === 'preview'" 
                          (click)="activeCodeTab = 'preview'">👁️ Preview</button>
                </div>

                <div class="editor-content">
                  <textarea *ngIf="activeCodeTab === 'html'"
                            [(ngModel)]="currentInteraction.htmlCode"
                            class="code-editor"
                            placeholder="<div>Your HTML here...</div>"
                            spellcheck="false"></textarea>
                  
                  <textarea *ngIf="activeCodeTab === 'css'"
                            [(ngModel)]="currentInteraction.cssCode"
                            class="code-editor"
                            placeholder=".your-class { color: red; }"
                            spellcheck="false"></textarea>
                  
                  <textarea *ngIf="activeCodeTab === 'js'"
                            [(ngModel)]="currentInteraction.jsCode"
                            class="code-editor"
                            placeholder="// Your JavaScript here..."
                            spellcheck="false"></textarea>
                  
                  <div *ngIf="activeCodeTab === 'preview'" class="preview-pane">
                    <iframe [srcdoc]="getHtmlPreview()" sandbox="allow-scripts" class="preview-iframe"></iframe>
                  </div>
                </div>
              </div>

              <!-- PixiJS Editor -->
              <div *ngIf="currentInteraction.interactionTypeCategory === 'pixijs'" class="pixijs-editor">
                <div class="editor-tabs">
                  <button [class.active]="activeCodeTab === 'pixijs'" 
                          (click)="activeCodeTab = 'pixijs'">TypeScript/JavaScript</button>
                  <button [class.active]="activeCodeTab === 'preview'" 
                          (click)="activeCodeTab = 'preview'">👁️ Preview</button>
                </div>

                <div class="editor-content">
                  <textarea *ngIf="activeCodeTab === 'pixijs'"
                            [(ngModel)]="currentInteraction.jsCode"
                            class="code-editor pixijs-code"
                            placeholder="// PixiJS Interaction Code
// Example:
class MyInteraction {
  constructor(app, config, data) {
    this.app = app; // PixiJS Application
    this.config = config;
    this.data = data;
  }
  
  init() {
    // Setup your PixiJS scene here
    const sprite = PIXI.Sprite.from('image.png');
    this.app.stage.addChild(sprite);
  }
  
  destroy() {
    // Cleanup
  }
}

export default MyInteraction;"
                            spellcheck="false"></textarea>
                  
                  <div *ngIf="activeCodeTab === 'preview'" class="preview-pane">
                    <div class="preview-placeholder">
                      <p>PixiJS Preview</p>
                      <small>Live preview coming soon</small>
                    </div>
                  </div>
                </div>
              </div>

              <!-- iFrame Editor -->
              <div *ngIf="currentInteraction.interactionTypeCategory === 'iframe'" class="iframe-editor">
                <div class="form-group">
                  <label>iFrame URL *</label>
                  <input type="url" 
                         [(ngModel)]="currentInteraction.iframeUrl" 
                         placeholder="https://example.com/interactive-content" />
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Width (px or %)</label>
                    <input type="text" 
                           [(ngModel)]="iframeWidth" 
                           placeholder="800px or 100%" />
                  </div>
                  <div class="form-group">
                    <label>Height (px or %)</label>
                    <input type="text" 
                           [(ngModel)]="iframeHeight" 
                           placeholder="600px or 100%" />
                  </div>
                </div>

                <div class="form-group">
                  <label>Permissions</label>
                  <div class="checkbox-group">
                    <label><input type="checkbox" [(ngModel)]="allowFullscreen" /> Allow Fullscreen</label>
                    <label><input type="checkbox" [(ngModel)]="allowScripts" /> Allow Scripts</label>
                    <label><input type="checkbox" [(ngModel)]="allowForms" /> Allow Forms</label>
                  </div>
                </div>

                <div class="preview-section">
                  <h3>Preview</h3>
                  <iframe *ngIf="currentInteraction.iframeUrl"
                          [src]="getSafeIframeUrl()"
                          [style.width]="iframeWidth || '100%'"
                          [style.height]="iframeHeight || '400px'"
                          [attr.allowfullscreen]="allowFullscreen ? '' : null"
                          class="iframe-preview"></iframe>
                  <div *ngIf="!currentInteraction.iframeUrl" class="preview-placeholder">
                    <p>Enter a URL to see preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Snackbar -->
      <div *ngIf="snackbar.visible" class="snackbar" [class.error]="snackbar.type === 'error'">
        {{ snackbar.message }}
      </div>
    </div>
  `,
  styles: [`
    .interaction-builder {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #0a0a0a;
      color: white;
    }

    .builder-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: #141414;
      border-bottom: 1px solid #333;
    }

    .builder-header h1 {
      flex: 1;
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
    }

    .builder-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Sidebar */
    .interaction-library {
      width: 320px;
      background: #141414;
      border-right: 1px solid #333;
      display: flex;
      flex-direction: column;
    }

    .library-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid #333;
    }

    .library-header h2 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
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
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
      margin-bottom: 0.5rem;
    }

    .interaction-item:hover {
      background: #1a1a1a;
    }

    .interaction-item.active {
      background: rgba(204, 0, 0, 0.2);
      border: 1px solid #cc0000;
    }

    .interaction-icon {
      font-size: 1.5rem;
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
      border-radius: 6px;
    }

    .interaction-info {
      flex: 1;
      min-width: 0;
    }

    .interaction-name {
      font-weight: 500;
      margin-bottom: 0.25rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .interaction-type {
      font-size: 0.75rem;
      color: #999;
    }

    /* Main Content */
    .builder-main {
      flex: 1;
      overflow-y: auto;
      padding: 2rem;
    }

    .empty-builder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-builder h2 {
      font-size: 1.5rem;
      margin: 0 0 0.5rem;
      color: white;
    }

    .editor-container {
      max-width: 1200px;
    }

    /* Forms */
    .info-section,
    .editor-section {
      background: #141414;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-group label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #ccc;
      margin-bottom: 0.5rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 0.75rem;
      color: white;
      font-size: 0.875rem;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #cc0000;
    }

    .form-group input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .hint {
      display: block;
      font-size: 0.75rem;
      color: #777;
      margin-top: 0.25rem;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: normal;
      margin-bottom: 0;
    }

    .checkbox-group input[type="checkbox"] {
      width: auto;
    }

    /* Code Editor */
    .editor-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .editor-tabs button {
      padding: 0.5rem 1rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      color: #999;
      cursor: pointer;
      transition: all 0.2s;
    }

    .editor-tabs button:hover {
      background: #1a1a1a;
      color: white;
    }

    .editor-tabs button.active {
      background: #cc0000;
      border-color: #cc0000;
      color: white;
    }

    .editor-content {
      min-height: 400px;
    }

    .code-editor {
      width: 100%;
      height: 500px;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 1rem;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      resize: vertical;
    }

    .preview-pane {
      width: 100%;
      height: 500px;
      background: white;
      border: 1px solid #333;
      border-radius: 6px;
      overflow: hidden;
    }

    .preview-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    .iframe-preview {
      border: 1px solid #333;
      border-radius: 6px;
    }

    .preview-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;
    }

    .preview-placeholder p {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
    }

    .preview-placeholder small {
      font-size: 0.875rem;
    }

    .preview-section h3 {
      font-size: 1rem;
      margin: 0 0 1rem;
    }

    /* Buttons */
    .btn-icon {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
      transition: background 0.2s;
    }

    .btn-icon:hover {
      background: #1a1a1a;
    }

    .btn-small {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #cc0000;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #b30000;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-small.btn-primary {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }

    /* Empty States */
    .empty-state {
      padding: 2rem;
      text-align: center;
      color: #999;
    }

    /* Snackbar */
    .snackbar {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: #cc0000;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 9999;
    }

    .snackbar.error {
      background: #ff0000;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      
      .interaction-library {
        width: 280px;
      }
    }
  `]
})
export class InteractionBuilderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  interactions: InteractionType[] = [];
  currentInteraction: InteractionType | null = null;
  isNewInteraction = false;
  saving = false;

  // Code editor tabs
  activeCodeTab: 'html' | 'css' | 'js' | 'pixijs' | 'preview' = 'html';

  // iFrame config
  iframeWidth = '100%';
  iframeHeight = '600px';
  allowFullscreen = true;
  allowScripts = true;
  allowForms = false;

  snackbar = { visible: false, message: '', type: 'success' as 'success' | 'error' };
  private snackbarTimeout: any;

  constructor(
    private lessonService: LessonService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.lessonService.setCurrentPage('interaction-builder');
    this.loadInteractions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.snackbarTimeout) clearTimeout(this.snackbarTimeout);
  }

  loadInteractions() {
    this.http.get<InteractionType[]>(`${environment.apiUrl}/interaction-types`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (interactions) => {
          this.interactions = interactions;
          console.log('[InteractionBuilder] Loaded interactions:', interactions);
        },
        error: (err) => {
          console.error('[InteractionBuilder] Failed to load interactions:', err);
          this.showSnackbar('Failed to load interactions', 'error');
        }
      });
  }

  createNew() {
    this.currentInteraction = {
      id: '',
      name: '',
      description: '',
      interactionTypeCategory: undefined,
      isActive: true
    };
    this.isNewInteraction = true;
    this.activeCodeTab = 'html';
  }

  loadInteraction(interaction: InteractionType) {
    this.currentInteraction = { ...interaction };
    this.isNewInteraction = false;
    
    // Load iFrame config if it exists
    if (interaction.iframeConfig) {
      this.iframeWidth = interaction.iframeConfig.width || '100%';
      this.iframeHeight = interaction.iframeConfig.height || '600px';
      this.allowFullscreen = interaction.iframeConfig.allowFullscreen !== false;
      this.allowScripts = interaction.iframeConfig.allowScripts !== false;
      this.allowForms = interaction.iframeConfig.allowForms === true;
    }

    // Set active tab based on type
    if (interaction.interactionTypeCategory === 'pixijs') {
      this.activeCodeTab = 'pixijs';
    } else {
      this.activeCodeTab = 'html';
    }
  }

  onTypeChange() {
    // Initialize code templates based on type
    if (this.currentInteraction) {
      if (this.currentInteraction.interactionTypeCategory === 'html' && !this.currentInteraction.htmlCode) {
        this.currentInteraction.htmlCode = '<div class="interaction-container">\n  <h2>My Interaction</h2>\n  <button onclick="handleClick()">Click Me</button>\n</div>';
        this.currentInteraction.cssCode = '.interaction-container {\n  padding: 20px;\n  text-align: center;\n}\n\nbutton {\n  padding: 10px 20px;\n  font-size: 16px;\n}';
        this.currentInteraction.jsCode = 'function handleClick() {\n  console.log(\'Button clicked!\');\n  alert(\'Hello from your interaction!\');\n}';
      } else if (this.currentInteraction.interactionTypeCategory === 'pixijs' && !this.currentInteraction.jsCode) {
        this.currentInteraction.jsCode = `// PixiJS Interaction
class MyInteraction {
  constructor(app, config, data) {
    this.app = app;
    this.config = config;
    this.data = data;
  }
  
  init() {
    // Create a simple sprite
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xFF0000);
    graphics.drawCircle(100, 100, 50);
    graphics.endFill();
    graphics.interactive = true;
    graphics.buttonMode = true;
    graphics.on('pointerdown', () => {
      console.log('Circle clicked!');
    });
    
    this.app.stage.addChild(graphics);
  }
  
  destroy() {
    // Cleanup
    this.app.stage.removeChildren();
  }
}

export default MyInteraction;`;
      }
    }
  }

  saveInteraction() {
    if (!this.currentInteraction) return;

    // Validation
    if (!this.currentInteraction.id || !this.currentInteraction.name || !this.currentInteraction.description) {
      this.showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    if (!this.currentInteraction.interactionTypeCategory) {
      this.showSnackbar('Please select an interaction type', 'error');
      return;
    }

    this.saving = true;

    // Prepare iFrame config if applicable
    if (this.currentInteraction.interactionTypeCategory === 'iframe') {
      this.currentInteraction.iframeConfig = {
        width: this.iframeWidth,
        height: this.iframeHeight,
        allowFullscreen: this.allowFullscreen,
        allowScripts: this.allowScripts,
        allowForms: this.allowForms
      };
    }

    const request = this.isNewInteraction
      ? this.http.post(`${environment.apiUrl}/interaction-types`, this.currentInteraction)
      : this.http.put(`${environment.apiUrl}/interaction-types/${this.currentInteraction.id}`, this.currentInteraction);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (saved: any) => {
          this.saving = false;
          this.showSnackbar('Interaction saved successfully!', 'success');
          this.isNewInteraction = false;
          this.loadInteractions();
          console.log('[InteractionBuilder] Saved interaction:', saved);
        },
        error: (err) => {
          this.saving = false;
          console.error('[InteractionBuilder] Failed to save:', err);
          this.showSnackbar('Failed to save interaction: ' + (err.error?.message || err.message), 'error');
        }
      });
  }

  getTypeLabel(type?: string): string {
    switch (type) {
      case 'html': return 'HTML';
      case 'pixijs': return 'PixiJS';
      case 'iframe': return 'iFrame';
      default: return 'Legacy';
    }
  }

  getHtmlPreview(): string {
    if (!this.currentInteraction) return '';
    
    const html = this.currentInteraction.htmlCode || '';
    const css = this.currentInteraction.cssCode || '';
    const js = this.currentInteraction.jsCode || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>${css}</style>
      </head>
      <body>
        ${html}
        <script>${js}</script>
      </body>
      </html>
    `;
  }

  getSafeIframeUrl(): any {
    // In a real app, use DomSanitizer
    return this.currentInteraction?.iframeUrl || '';
  }

  private showSnackbar(message: string, type: 'success' | 'error' = 'success') {
    if (this.snackbarTimeout) clearTimeout(this.snackbarTimeout);
    this.snackbar = { visible: true, message, type };
    this.snackbarTimeout = setTimeout(() => {
      this.snackbar.visible = false;
    }, 3000);
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}

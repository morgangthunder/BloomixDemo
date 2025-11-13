import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrueFalseSelectionComponent } from '../../../features/interactions/true-false-selection/true-false-selection.component';

@Component({
  selector: 'app-interaction-configure-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TrueFalseSelectionComponent],
  template: `
    <div *ngIf="isOpen" class="modal-overlay-fullscreen" (click)="close()">
      <div class="modal-container-fullscreen" (click)="$event.stopPropagation()">
        <div class="modal-header-sticky">
          <h2>⚙️ {{interactionName || 'Interaction'}} Configuration</h2>
          <button (click)="close()" class="close-btn">✕</button>
        </div>

        <!-- Tab Navigation -->
        <div class="modal-tabs">
          <button 
            class="modal-tab"
            [class.active]="activeTab === 'configure'"
            (click)="activeTab = 'configure'">
            ⚙️ Configure
          </button>
          <button 
            class="modal-tab"
            [class.active]="activeTab === 'preview'"
            (click)="activeTab = 'preview'">
            👁️ Preview
          </button>
        </div>

        <div class="modal-body-scrollable">
          <!-- Configure Tab -->
          <div *ngIf="activeTab === 'configure'" class="config-section">
            <!-- Dynamic config form based on configSchema -->
            <div *ngIf="configSchema && configSchema.fields && configSchema.fields.length > 0">
              <div *ngFor="let field of configSchema.fields" class="form-group">
                <!-- String Input -->
                <div *ngIf="field.type === 'string' && !field.multiline">
                  <label [for]="'field-' + field.key">{{field.label || field.key}}</label>
                  <input 
                    [id]="'field-' + field.key"
                    type="text" 
                    [(ngModel)]="config[field.key]" 
                    (ngModelChange)="onConfigChange()"
                    [placeholder]="field.placeholder || ''" 
                    class="form-input" />
                  <p *ngIf="field.hint" class="hint">{{field.hint}}</p>
                </div>

                <!-- Multiline Text Input -->
                <div *ngIf="field.type === 'string' && field.multiline">
                  <label [for]="'field-' + field.key">{{field.label || field.key}}</label>
                  <textarea 
                    [id]="'field-' + field.key"
                    [(ngModel)]="config[field.key]" 
                    (ngModelChange)="onConfigChange()"
                    [rows]="field.rows || 3"
                    [placeholder]="field.placeholder || ''" 
                    class="form-input"></textarea>
                  <p *ngIf="field.hint" class="hint">{{field.hint}}</p>
                </div>

                <!-- Boolean Checkbox -->
                <div *ngIf="field.type === 'boolean'" class="checkbox-group">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox"
                      [(ngModel)]="config[field.key]" 
                      (ngModelChange)="onConfigChange()"
                      class="form-checkbox" />
                    <span>{{field.label || field.key}}</span>
                  </label>
                  <p *ngIf="field.hint" class="hint">{{field.hint}}</p>
                </div>

                <!-- Number Input -->
                <div *ngIf="field.type === 'number'">
                  <label [for]="'field-' + field.key">{{field.label || field.key}}</label>
                  <input 
                    [id]="'field-' + field.key"
                    type="number" 
                    [(ngModel)]="config[field.key]" 
                    (ngModelChange)="onConfigChange()"
                    [placeholder]="field.placeholder || ''" 
                    [min]="field.min"
                    [max]="field.max"
                    class="form-input" />
                  <p *ngIf="field.hint" class="hint">{{field.hint}}</p>
                </div>

                <!-- Select Dropdown -->
                <div *ngIf="field.type === 'select'">
                  <label [for]="'field-' + field.key">{{field.label || field.key}}</label>
                  <select 
                    [id]="'field-' + field.key"
                    [(ngModel)]="config[field.key]" 
                    (ngModelChange)="onConfigChange()"
                    class="form-input">
                    <option *ngFor="let option of field.options" [value]="option.value">
                      {{option.label || option.value}}
                    </option>
                  </select>
                  <p *ngIf="field.hint" class="hint">{{field.hint}}</p>
                </div>

                <!-- Array/List (Read-only display for now) -->
                <div *ngIf="field.type === 'array'" class="array-field">
                  <label>{{field.label || field.key}}</label>
                  <p class="hint">{{field.hint || 'This field is managed by the processed content output'}}</p>
                  <div class="array-preview">
                    <div *ngIf="config[field.key] && config[field.key].length > 0" class="array-items">
                      <div *ngFor="let item of config[field.key]; let i = index" class="array-item">
                        {{i + 1}}. {{getArrayItemPreview(item)}}
                      </div>
                    </div>
                    <p *ngIf="!config[field.key] || config[field.key].length === 0" class="empty-array">
                      No items yet
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Show message if no configSchema -->
            <div *ngIf="!configSchema || !configSchema.fields || configSchema.fields.length === 0" class="config-schema-display">
              <h3>No Configuration Schema</h3>
              <p class="hint">This interaction doesn't have a configuration schema defined yet.</p>
              <p class="hint">Add a <code>configSchema</code> to this interaction type to enable dynamic form generation.</p>
            </div>
          </div>

          <!-- Preview Tab -->
          <div *ngIf="activeTab === 'preview'" class="preview-tab-content">
            <div class="interaction-preview-fullscreen">
              <!-- Loading state -->
              <div *ngIf="!previewData" class="preview-loading">
                <p>⚠️ No sample data provided for preview</p>
              </div>
              
              <!-- True/False Selection Preview -->
              <app-true-false-selection
                *ngIf="previewData && interactionType === 'true-false-selection'"
                [data]="previewData"
                (interactionComplete)="onPreviewComplete($event)">
              </app-true-false-selection>
              
              <!-- Placeholder for other types -->
              <div *ngIf="previewData && interactionType && interactionType !== 'true-false-selection'" class="preview-placeholder">
                <p>Preview for {{interactionType}} not yet implemented</p>
                <pre>{{previewDataJson}}</pre>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer-sticky">
          <button (click)="close()" class="btn-secondary">Cancel</button>
          <button (click)="save()" class="btn-primary">Save Configuration</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
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

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
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

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
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
      color: #fff;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #999;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: all 0.2s;
      line-height: 1;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
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

    .config-section,
    .preview-tab-content {
      animation: fadeIn 0.2s ease;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: #e5e5e5;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      color: #fff;
      font-family: inherit;
      font-size: 0.9375rem;
    }

    .form-input:focus {
      outline: none;
      border-color: #00d4ff;
      box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
    }

    .hint {
      font-size: 0.875rem;
      color: #999;
      margin-top: 0.5rem;
    }

    .config-schema-display h3 {
      font-size: 1.125rem;
      margin: 0 0 1rem 0;
      color: #00d4ff;
    }

    .schema-preview {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 1rem;
      color: #999;
      font-size: 0.875rem;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .interaction-preview-fullscreen {
      min-height: 400px;
    }

    .preview-loading,
    .preview-placeholder {
      text-align: center;
      padding: 3rem 1rem;
      color: #999;
    }

    .preview-placeholder pre {
      margin-top: 1rem;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 1rem;
      font-size: 0.875rem;
      text-align: left;
      max-height: 300px;
      overflow-y: auto;
    }

    .btn-primary,
    .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #00d4ff;
      color: #0f0f23;
    }

    .btn-primary:hover {
      background: #00bce6;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #2a2a2a;
      color: white;
      border: 1px solid #444;
    }

    .btn-secondary:hover {
      background: #333;
      border-color: #555;
    }

    .checkbox-group {
      margin-bottom: 1.5rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      color: #e5e5e5;
    }

    .form-checkbox {
      width: 1.25rem;
      height: 1.25rem;
      cursor: pointer;
      accent-color: #00d4ff;
    }

    .array-field {
      margin-bottom: 1.5rem;
    }

    .array-preview {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-top: 0.5rem;
    }

    .array-items {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .array-item {
      padding: 0.5rem;
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      color: #999;
    }

    .empty-array {
      text-align: center;
      color: #666;
      font-style: italic;
      margin: 0;
    }

    code {
      background: #2a2a2a;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      color: #00d4ff;
    }
  `]
})
export class InteractionConfigureModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() interactionType: string = '';
  @Input() interactionName: string = '';
  @Input() configSchema: any = null;
  @Input() sampleData: any = null;
  @Input() initialConfig: any = {};

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  activeTab: 'configure' | 'preview' = 'configure';
  config: any = {};
  previewData: any = null;

  get configSchemaJson(): string {
    return this.configSchema ? JSON.stringify(this.configSchema, null, 2) : 'No config schema defined';
  }

  get previewDataJson(): string {
    return this.previewData ? JSON.stringify(this.previewData, null, 2) : '';
  }

  ngOnChanges() {
    if (this.isOpen) {
      this.activeTab = 'configure';
      
      // Initialize config with defaults from schema
      this.config = { ...this.initialConfig };
      if (this.configSchema && this.configSchema.fields) {
        this.configSchema.fields.forEach((field: any) => {
          if (field.default !== undefined && this.config[field.key] === undefined) {
            this.config[field.key] = field.default;
          }
        });
      }
      
      // Merge sample data with config for preview
      this.previewData = {
        ...this.sampleData,
        ...this.config
      };
      
      // Hide page header and prevent scroll
      this.hidePageElements();
      
      console.log('[ConfigModal] 🎯 Opened for:', this.interactionType);
      console.log('[ConfigModal] 📋 Config Schema:', this.configSchema);
      console.log('[ConfigModal] 📊 Sample Data:', this.sampleData);
      console.log('[ConfigModal] ⚙️ Initial Config:', this.config);
    }
  }

  onConfigChange() {
    // Dynamically update preview data based on config changes
    console.log('[ConfigModal] ⚙️ Config changed:', this.config);
    if (this.previewData) {
      this.previewData = {
        ...this.previewData,
        ...this.config
      };
    }
  }

  onPreviewComplete(result: any) {
    console.log('[ConfigModal] ✅ Preview completed:', result);
  }

  getArrayItemPreview(item: any): string {
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
      // Try common preview fields
      return item.text || item.label || item.name || item.title || JSON.stringify(item).substring(0, 50) + '...';
    }
    return String(item);
  }

  hidePageElements() {
    // Hide the main app header (navigation)
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = 'none';
    }
    
    // Also hide any page-specific headers
    const builderHeader = document.querySelector('.builder-header, .editor-header');
    if (builderHeader) {
      (builderHeader as HTMLElement).style.display = 'none';
    }
    
    document.body.style.overflow = 'hidden';
  }

  restorePageElements() {
    // Show the main app header (navigation)
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = '';
    }
    
    // Restore page-specific headers
    const builderHeader = document.querySelector('.builder-header, .editor-header');
    if (builderHeader) {
      (builderHeader as HTMLElement).style.display = 'flex';
    }
    
    document.body.style.overflow = 'auto';
  }

  close() {
    this.restorePageElements();
    this.closed.emit();
  }

  save() {
    this.restorePageElements();
    this.saved.emit(this.config);
  }
}


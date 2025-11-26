import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { TrueFalseSelectionComponent } from '../../../features/interactions/true-false-selection/true-false-selection.component';
import { ContentSourceService } from '../../../core/services/content-source.service';
import { environment } from '../../../../environments/environment';

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
            (click)="switchToPreviewTab()">
            👁️ Preview
          </button>
        </div>

        <div class="modal-body-scrollable">
          <!-- Configure Tab -->
          <div *ngIf="activeTab === 'configure'" class="config-section">
            <div class="form-group processed-content-selector">
              <label>Processed Content</label>
              <div class="config-value">
                <span class="value">{{selectedContentOutputName || 'None selected'}}</span>
                <button type="button" class="btn-small" (click)="onProcessedContentSelect($event)">Select</button>
              </div>
              <p class="hint">Choose which processed output powers this interaction.</p>
            </div>
            <!-- Dynamic config form based on configSchema -->
            <div *ngIf="configSchema && configSchema.fields && configSchema.fields.length > 0">
              <div *ngFor="let field of configSchema.fields" class="form-group">
                <!-- String Input -->
                <div *ngIf="field.type === 'string' && !field.multiline && !field.readOnly">
                  <label [for]="'field-' + field.key">
                    {{field.label || field.key}}
                    <span *ngIf="field.required" class="required-indicator">*</span>
                    <span *ngIf="isBuilderMode && field.builderReadOnly" class="readonly-badge">Read-only</span>
                  </label>
                  <input 
                    [id]="'field-' + field.key"
                    type="text" 
                    [(ngModel)]="config[field.key]" 
                    (ngModelChange)="onConfigChange()"
                    [placeholder]="field.placeholder || ''" 
                    [required]="field.required"
                    [disabled]="isBuilderMode && field.builderReadOnly"
                    class="form-input" />
                  <p *ngIf="field.hint && !(isBuilderMode && field.builderReadOnly)" class="hint">{{field.hint}}</p>
                  <p *ngIf="isBuilderMode && field.builderReadOnly && field.builderHint" class="hint builder-hint">{{field.builderHint}}</p>
                </div>

                <!-- Multiline Text Input -->
                <div *ngIf="field.type === 'string' && field.multiline && !field.readOnly">
                  <label [for]="'field-' + field.key">
                    {{field.label || field.key}}
                    <span *ngIf="field.required" class="required-indicator">*</span>
                  </label>
                  <textarea 
                    [id]="'field-' + field.key"
                    [(ngModel)]="config[field.key]" 
                    (ngModelChange)="onConfigChange()"
                    [rows]="field.rows || 3"
                    [placeholder]="field.placeholder || ''" 
                    [required]="field.required"
                    class="form-input"></textarea>
                  <p *ngIf="field.hint" class="hint">{{field.hint}}</p>
                </div>

                <!-- Boolean Checkbox -->
                <div *ngIf="field.type === 'boolean' && !field.readOnly" class="checkbox-group">
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
                <div *ngIf="field.type === 'number' && !field.readOnly">
                  <label [for]="'field-' + field.key">
                    {{field.label || field.key}}
                    <span *ngIf="field.required" class="required-indicator">*</span>
                  </label>
                  <input 
                    [id]="'field-' + field.key"
                    type="number" 
                    [(ngModel)]="config[field.key]" 
                    (ngModelChange)="onConfigChange()"
                    [placeholder]="field.placeholder || ''" 
                    [min]="field.min"
                    [max]="field.max"
                    [required]="field.required"
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

                <!-- Array/List (Read-only or editable) -->
                <div *ngIf="field.type === 'array'" class="array-field">
                  <label>
                    {{field.label || field.key}}
                    <span *ngIf="field.required" class="required-indicator">*</span>
                    <span *ngIf="field.readOnly" class="readonly-badge">Read-only</span>
                  </label>
                  <p *ngIf="field.hint" class="hint">{{field.hint}}</p>
                  <div class="array-preview" *ngIf="field.readOnly">
                    <div *ngIf="config[field.key] && config[field.key].length > 0" class="array-items">
                      <div *ngFor="let item of config[field.key]; let i = index" class="array-item">
                        {{i + 1}}. {{getArrayItemPreview(item)}}
                      </div>
                    </div>
                    <p *ngIf="!config[field.key] || config[field.key].length === 0" class="empty-array">
                      No items configured yet
                    </p>
                  </div>
                  <!-- Future: Editable array editor for non-readOnly arrays -->
                  <div *ngIf="!field.readOnly" class="array-editor-placeholder">
                    <p class="hint">Array editor coming soon. For now, arrays are managed externally.</p>
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

            <!-- iFrame Guide Document & Webpage (only for iframe interactions) -->
            <div *ngIf="interactionCategory === 'iframe'" class="iframe-guide-section">
              <h3 class="section-title">📄 iFrame Guide Resources</h3>
              <p class="section-description" *ngIf="!isBuilderMode">
                Add guide documents or webpages that will be processed and linked to this lesson for AI Teacher context.
              </p>
              <p class="section-description" *ngIf="isBuilderMode">
                Guide documents and webpages are configured per lesson in the lesson editor. These fields show the configured values for preview.
              </p>
              
              <!-- iFrame Guide Document Upload -->
              <div class="form-group">
                <label for="iframe-guide-doc">
                  📄 iFrame Guide Doc
                  <span class="hint">(PDF, DOCX, or TXT - will be processed and vectorized)</span>
                  <span *ngIf="isBuilderMode" class="readonly-badge">Read-only</span>
                </label>
                <div class="file-upload-container" *ngIf="!isBuilderMode && lessonId">
                  <input 
                    type="file" 
                    id="iframe-guide-doc"
                    #fileInput
                    (change)="onDocumentFileSelected($event)"
                    accept=".pdf,.docx,.doc,.txt"
                    class="file-input" />
                  <div class="file-upload-info" *ngIf="iframeGuideDocFile">
                    <span class="file-name">{{iframeGuideDocFile.name}}</span>
                    <button type="button" (click)="removeDocumentFile()" class="btn-remove-file">✕</button>
                  </div>
                  <div class="file-upload-info" *ngIf="!iframeGuideDocFile && config.iframeGuideDocUrl">
                    <span class="file-name">Current: {{config.iframeGuideDocFileName || 'Document'}}</span>
                    <button type="button" (click)="removeDocumentFile()" class="btn-remove-file">✕</button>
                  </div>
                  <p *ngIf="uploadingDocument" class="upload-status">⏳ Uploading and processing...</p>
                </div>
                <!-- Read-only display in builder mode -->
                <div *ngIf="isBuilderMode" class="readonly-field">
                  <div class="file-upload-info" *ngIf="config.iframeGuideDocUrl || config.iframeGuideDocFileName">
                    <span class="file-name">{{config.iframeGuideDocFileName || 'Document configured'}}</span>
                  </div>
                  <p *ngIf="!config.iframeGuideDocUrl && !config.iframeGuideDocFileName" class="empty-field">No document configured</p>
                  <p *ngIf="isBuilderMode" class="hint builder-hint">Configured per lesson in lesson editor</p>
                </div>
              </div>

              <!-- iFrame Guide Webpage URL -->
              <div class="form-group">
                <label for="iframe-guide-webpage">
                  🌐 iFrame Guide Webpage
                  <span class="hint">(URL - will be processed and vectorized)</span>
                  <span *ngIf="isBuilderMode" class="readonly-badge">Read-only</span>
                </label>
                <input 
                  *ngIf="!isBuilderMode && lessonId"
                  type="url" 
                  id="iframe-guide-webpage"
                  [(ngModel)]="config.iframeGuideWebpageUrl"
                  (blur)="normalizeUrl()"
                  (ngModelChange)="onUrlInputChange($event)"
                  placeholder="https://example.com/guide"
                  class="form-input" />
                <!-- Read-only display in builder mode -->
                <div *ngIf="isBuilderMode" class="readonly-field">
                  <div class="readonly-input">
                    {{config.iframeGuideWebpageUrl || 'No URL configured'}}
                  </div>
                  <p *ngIf="isBuilderMode" class="hint builder-hint">Configured per lesson in lesson editor</p>
                </div>
                <p *ngIf="!isBuilderMode" class="hint">Enter a URL to a webpage that serves as a guide for this iframe interaction.</p>
                <button 
                  *ngIf="!isBuilderMode && config.iframeGuideWebpageUrl && !processingWebpage && lessonId"
                  type="button"
                  (click)="processWebpageUrl()"
                  [disabled]="isWebpageProcessed"
                  [class.btn-process-url]="!isWebpageProcessed"
                  [class.btn-process-url-disabled]="isWebpageProcessed"
                  [title]="isWebpageProcessed ? 'This URL has already been processed' : 'Process and link this URL to the lesson'">
                  🔄 Process & Link to Lesson
                </button>
                <p *ngIf="processingWebpage" class="upload-status">⏳ Processing webpage...</p>
                <p *ngIf="isWebpageProcessed && !processingWebpage" class="hint" style="color: #00d4ff; margin-top: 0.5rem;">✅ URL has been processed and linked to lesson</p>
              </div>
            </div>
          </div>

          <!-- Preview Tab -->
          <div *ngIf="activeTab === 'preview'" class="preview-tab-content">
            <div class="interaction-preview-fullscreen">
              <!-- Loading state -->
              <div *ngIf="!previewData" class="preview-loading">
                <p>⚠️ No sample data provided for preview</p>
              </div>
              
              <!-- HTML/PixiJS/iFrame Preview -->
              <div *ngIf="previewData && (interactionCategory === 'html' || interactionCategory === 'pixijs' || interactionCategory === 'iframe') && htmlCode" 
                   class="iframe-preview-container">
                <iframe 
                  [src]="getInteractionPreviewBlobUrlSafe()"
                  style="width: 100%; height: 600px; border: 1px solid #333; border-radius: 0.5rem; background: #0f0f23;"
                  frameborder="0"></iframe>
              </div>
              
              <!-- True/False Selection Preview (legacy component-based preview) -->
              <app-true-false-selection
                *ngIf="previewData && interactionType === 'true-false-selection' && interactionCategory !== 'html' && interactionCategory !== 'pixijs' && interactionCategory !== 'iframe'"
                [data]="previewData"
                (interactionComplete)="onPreviewComplete($event)">
              </app-true-false-selection>
              
              <!-- Placeholder for other types -->
              <div *ngIf="previewData && interactionType && interactionCategory !== 'html' && interactionCategory !== 'pixijs' && interactionCategory !== 'iframe' && interactionType !== 'true-false-selection'" 
                   class="preview-placeholder">
                <p>Preview for {{interactionType}} ({{interactionCategory}}) not yet implemented</p>
                <pre>{{previewDataJson}}</pre>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer-sticky">
          <button (click)="close()" class="btn-secondary">Cancel</button>
          <button 
            (click)="save()" 
            [class.btn-primary]="hasConfigChanges"
            [class.btn-primary-disabled]="!hasConfigChanges"
            [disabled]="!hasConfigChanges"
            [title]="!hasConfigChanges ? 'No changes to save' : 'Save configuration changes'">
            Save Configuration
          </button>
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

    .processed-content-selector .config-value {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .processed-content-selector .value {
      font-weight: 600;
      color: #fff;
    }

    .btn-small {
      background: #333;
      border: 1px solid #444;
      color: #fff;
      padding: 0.35rem 0.85rem;
      border-radius: 0.4rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .btn-small:hover {
      background: #555;
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

    .btn-primary:disabled,
    .btn-primary-disabled {
      background: #2a2a2a;
      color: #666;
      cursor: not-allowed;
      opacity: 0.6;
      border: 1px solid #333;
    }

    .btn-primary:disabled:hover,
    .btn-primary-disabled:hover {
      background: #2a2a2a;
      transform: none;
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

    .required-indicator {
      color: #ff4444;
      margin-left: 0.25rem;
      font-weight: bold;
    }

    .readonly-badge {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.125rem 0.5rem;
      background: #2a2a2a;
      color: #999;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .array-editor-placeholder {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 1.5rem;
      text-align: center;
      color: #666;
      font-style: italic;
    }

    label {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
    }

    .builder-hint {
      color: #00d4ff;
      font-style: italic;
      font-weight: 500;
    }

    .form-input:disabled {
      background: #1a1a1a;
      color: #666;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .iframe-guide-section {
      margin-top: 2rem;
      padding: 1.5rem;
      background: rgba(0, 212, 255, 0.05);
      border: 1px solid rgba(0, 212, 255, 0.2);
      border-radius: 0.5rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #00d4ff;
      margin: 0 0 0.5rem 0;
    }

    .section-description {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0 0 1.5rem 0;
    }

    .file-upload-container {
      margin-top: 0.5rem;
    }

    .file-input {
      width: 100%;
      padding: 0.75rem;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      color: #fff;
      font-family: inherit;
      font-size: 0.9375rem;
      cursor: pointer;
    }

    .file-input:focus {
      outline: none;
      border-color: #00d4ff;
      box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
    }

    .file-upload-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
    }

    .file-name {
      color: #fff;
      font-size: 0.875rem;
      flex: 1;
    }

    .btn-remove-file {
      background: transparent;
      border: none;
      color: #ff4444;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 1rem;
      transition: all 0.2s;
    }

    .btn-remove-file:hover {
      background: rgba(255, 68, 68, 0.1);
    }

    .upload-status {
      margin-top: 0.5rem;
      color: #00d4ff;
      font-size: 0.875rem;
      font-style: italic;
    }

    .btn-process-url {
      margin-top: 0.5rem;
      padding: 0.5rem 1rem;
      background: #00d4ff;
      color: #0f0f23;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-process-url:hover {
      background: #00bce6;
      transform: translateY(-1px);
    }

    .btn-process-url:disabled,
    .btn-process-url-disabled {
      background: #2a2a2a;
      color: #666;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .btn-process-url:disabled:hover,
    .btn-process-url-disabled:hover {
      background: #2a2a2a;
      transform: none;
    }

    .readonly-field {
      margin-top: 0.5rem;
    }

    .readonly-input {
      padding: 0.75rem;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.9375rem;
      min-height: 2.5rem;
      display: flex;
      align-items: center;
    }

    .empty-field {
      padding: 0.75rem;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      color: rgba(255, 255, 255, 0.4);
      font-size: 0.9375rem;
      font-style: italic;
      margin: 0;
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
  @Input() interactionCategory: string = ''; // html, pixijs, iframe, legacy
  @Input() htmlCode: string = '';
  @Input() cssCode: string = '';
  @Input() jsCode: string = '';
  @Input() isBuilderMode: boolean = false; // true in interaction-builder, false in lesson-editor
  @Input() lessonId?: string; // Lesson ID for linking content sources
  @Input() selectedContentOutputName: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();
  @Output() processedContentSelect = new EventEmitter<void>();

  activeTab: 'configure' | 'preview' = 'configure';
  config: any = {};
  initialConfigSnapshot: any = {}; // Store initial config to detect changes
  previewData: any = null;
  currentBlobUrl: SafeResourceUrl | null = null;

  iframeGuideDocFile: File | null = null;
  uploadingDocument = false;
  processingWebpage = false;

  constructor(
    private domSanitizer: DomSanitizer,
    private http: HttpClient,
    private contentSourceService: ContentSourceService
  ) {}

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
          
          // In builder mode, populate builderReadOnly fields from sample data
          if (this.isBuilderMode && field.builderReadOnly && this.sampleData && this.sampleData[field.key] !== undefined) {
            this.config[field.key] = this.sampleData[field.key];
          }
        });
      }
      
      // Normalize URL when modal opens
      this.ensureUrlNormalized();
      
      // Store initial config snapshot for change detection (deep copy)
      this.initialConfigSnapshot = JSON.parse(JSON.stringify(this.config));
      
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
      console.log('[ConfigModal] 🏗️ Builder Mode:', this.isBuilderMode);
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

  /**
   * Check if config has been modified from initial state
   * Also checks if a new file has been selected
   */
  get hasConfigChanges(): boolean {
    const configChanged = JSON.stringify(this.config) !== JSON.stringify(this.initialConfigSnapshot);
    const fileSelected = !!this.iframeGuideDocFile;
    return configChanged || fileSelected;
  }

  /**
   * Check if webpage URL has already been processed
   */
  get isWebpageProcessed(): boolean {
    if (!this.config.iframeGuideWebpageUrl || this.isBuilderMode) {
      return false;
    }
    // Check if there's a content source ID stored (indicates processed)
    return !!this.config.iframeGuideWebpageContentSourceId;
  }

  /**
   * Check if document has already been processed
   */
  get isDocumentProcessed(): boolean {
    if (!this.config.iframeGuideDocUrl || this.isBuilderMode) {
      return false;
    }
    // Check if there's a content source ID stored (indicates processed)
    if (this.config.iframeGuideDocContentSourceId) {
      return true;
    }
    // Fallback: If iframeGuideDocUrl is a UUID (36 chars with hyphens), it's a content source ID (processed)
    // Otherwise, it might be a file path or URL (not yet processed)
    const url = String(this.config.iframeGuideDocUrl);
    return url.match(/^[a-f0-9-]{36}$/i) !== null;
  }

  /**
   * Check if URL or doc can be processed (not already processed and has value)
   */
  get canProcessContent(): boolean {
    if (this.isBuilderMode) {
      return false;
    }
    // Can process if there's a URL that hasn't been processed, or a doc file that hasn't been processed
    const hasUnprocessedUrl = this.config.iframeGuideWebpageUrl && !this.isWebpageProcessed;
    const hasUnprocessedDoc = (this.iframeGuideDocFile || this.config.iframeGuideDocUrl) && !this.isDocumentProcessed;
    return !!(hasUnprocessedUrl || hasUnprocessedDoc);
  }

  onPreviewComplete(result: any) {
    console.log('[ConfigModal] ✅ Preview completed:', result);
  }

  onProcessedContentSelect(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.processedContentSelect.emit();
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

  getInteractionPreviewBlobUrlSafe(): SafeResourceUrl {
    // Ensure URL is normalized before generating preview
    this.ensureUrlNormalized();
    return this.getInteractionPreviewBlobUrl();
  }

  ensureUrlNormalized() {
    // Normalize URL in config if it exists and doesn't have protocol
    if (this.config.iframeGuideWebpageUrl && !this.isBuilderMode) {
      let url = String(this.config.iframeGuideWebpageUrl).trim();
      if (url && !url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
        this.config.iframeGuideWebpageUrl = url;
        // Trigger change detection
        this.onConfigChange();
        console.log('[ConfigModal] ✅ Normalized URL:', url);
      }
    }
  }

  switchToPreviewTab() {
    // Normalize URL before switching to preview tab
    this.ensureUrlNormalized();
    this.activeTab = 'preview';
  }

  getInteractionPreviewBlobUrl(): SafeResourceUrl {
    console.log('[ConfigModal] 🎬 Generating preview blob URL...');
    console.log('[ConfigModal] Category:', this.interactionCategory);
    console.log('[ConfigModal] Has HTML:', !!this.htmlCode);
    console.log('[ConfigModal] Has CSS:', !!this.cssCode);
    console.log('[ConfigModal] Has JS:', !!this.jsCode);
    
    if (!this.htmlCode && !this.jsCode) {
      console.log('[ConfigModal] ⚠️ No code to render');
      return this.domSanitizer.bypassSecurityTrustResourceUrl('');
    }

    // Normalize URL in config before generating preview
    // Always use the current config, but ensure URL is normalized
    const normalizedConfig = { ...this.config };
    if (normalizedConfig.iframeGuideWebpageUrl && !this.isBuilderMode) {
      let url = String(normalizedConfig.iframeGuideWebpageUrl).trim();
      if (url && !url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
        normalizedConfig.iframeGuideWebpageUrl = url;
        // Also update the actual config so it persists
        this.config.iframeGuideWebpageUrl = url;
      }
      // CRITICAL: Normalize config.url if it exists (this is what the iframe uses)
      // DO NOT overwrite config.url with iframeGuideWebpageUrl - they serve different purposes:
      // - config.url: The actual URL for the iframe to display
      // - iframeGuideWebpageUrl: For content processing only, not for iframe display
      if (normalizedConfig.url && !this.isBuilderMode) {
        let url = String(normalizedConfig.url).trim();
        if (url && !url.match(/^https?:\/\//i)) {
          url = 'https://' + url;
          normalizedConfig.url = url;
          console.log('[ConfigModal] 🔗 Normalized config.url for iframe:', normalizedConfig.url);
        }
      }
    }

    const sampleDataJson = this.sampleData ? JSON.stringify(this.sampleData) : '{}';
    const configJson = JSON.stringify(normalizedConfig);

    console.log('[ConfigModal] 📋 Sample data for injection:', sampleDataJson.substring(0, 100) + '...');
    console.log('[ConfigModal] ⚙️ Config for injection:', configJson);

    const htmlDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; }
    ${this.cssCode || ''}
  </style>
</head>
<body>
  ${this.htmlCode || ''}
  <script>
    // Set interaction data FIRST
    window.interactionData = ${sampleDataJson};
    console.log('[Interaction] 🎯 Data injected:', window.interactionData);

    // Set interaction config
    window.interactionConfig = ${configJson};
    console.log('[Interaction] ⚙️ Config injected:', window.interactionConfig);

    // Then run the interaction code
    ${this.jsCode || ''}
  </script>
</body>
</html>
    `;

    console.log('[ConfigModal] ✅ Complete HTML document generated');
    console.log('[ConfigModal] 📄 HTML Document Length:', htmlDoc.length);

    // Create a Blob URL to bypass Angular's sanitization
    const blob = new Blob([htmlDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Revoke previous blob URL to prevent memory leaks
    if (this.currentBlobUrl) {
      const oldUrl = (this.currentBlobUrl as any).changingThisBreaksApplicationSecurity;
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }
    }
    this.currentBlobUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(url);
    console.log('[ConfigModal] 🔗 Created blob URL:', url);
    return this.currentBlobUrl;
  }

  close() {
    this.restorePageElements();
    this.closed.emit();
  }

  onDocumentFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.iframeGuideDocFile = input.files[0];
      console.log('[ConfigModal] 📄 Document selected:', this.iframeGuideDocFile.name);
      // Mark as changed when file is selected
      this.onConfigChange();
    }
  }

  removeDocumentFile() {
    this.iframeGuideDocFile = null;
    if (this.config.iframeGuideDocUrl) {
      delete this.config.iframeGuideDocUrl;
      delete this.config.iframeGuideDocFileName;
    }
    // Reset file input
    const fileInput = document.getElementById('iframe-guide-doc') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.onConfigChange();
  }

  async processWebpageUrl() {
    if (!this.config.iframeGuideWebpageUrl || !this.lessonId) {
      console.warn('[ConfigModal] ⚠️ Cannot process webpage: missing URL or lessonId');
      return;
    }

    // Normalize URL before processing
    this.normalizeUrl();

    this.processingWebpage = true;
    try {
      console.log('[ConfigModal] 🌐 Processing webpage URL:', this.config.iframeGuideWebpageUrl);
      
      // Create content source
      const contentSource = await this.contentSourceService.createContentSource({
        type: 'url',
        sourceUrl: this.config.iframeGuideWebpageUrl,
        title: `iFrame Guide: ${this.config.iframeGuideWebpageUrl}`,
        metadata: {
          source: 'iframe-guide',
          interactionType: this.interactionType,
        }
      });

      console.log('[ConfigModal] ✅ Content source created:', contentSource.id);

      // Link to lesson
      await this.contentSourceService.linkToLesson(this.lessonId, contentSource.id);
      console.log('[ConfigModal] ✅ Linked to lesson:', this.lessonId);

      // Submit for approval (which triggers processing)
      await this.contentSourceService.submitForApproval(contentSource.id);
      console.log('[ConfigModal] ✅ Submitted for approval and processing');

      // Store the content source ID in config for reference (so we know it's been processed)
      this.config.iframeGuideWebpageContentSourceId = contentSource.id;
      
      // Update initial snapshot since we've made a change
      this.initialConfigSnapshot = JSON.parse(JSON.stringify(this.config));
    } catch (error: any) {
      console.error('[ConfigModal] ❌ Failed to process webpage:', error);
      throw error; // Re-throw so caller can handle
    } finally {
      this.processingWebpage = false;
    }
  }

  onUrlInputChange(value: string) {
    // Normalize URL immediately on input change
    if (value && !this.isBuilderMode) {
      let url = String(value).trim();
      // Auto-add https:// if missing
      if (url && !url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
        this.config.iframeGuideWebpageUrl = url;
      }
    }
    this.onConfigChange();
  }

  normalizeUrl() {
    if (this.config.iframeGuideWebpageUrl && !this.isBuilderMode) {
      let url = this.config.iframeGuideWebpageUrl.trim();
      // Auto-add https:// if missing
      if (url && !url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
        this.config.iframeGuideWebpageUrl = url;
        this.onConfigChange();
      }
    }
  }

  async save() {
    // Normalize URL before processing (ensure https:// is added)
    // This updates the config object directly
    if (this.config.iframeGuideWebpageUrl && !this.isBuilderMode) {
      let url = String(this.config.iframeGuideWebpageUrl).trim();
      if (url && !url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
        this.config.iframeGuideWebpageUrl = url;
        // Trigger change detection
        this.onConfigChange();
      }
    }
    this.normalizeUrl();

    // Automatically process document file if present
    if (this.iframeGuideDocFile && this.lessonId) {
      this.uploadingDocument = true;
      try {
        console.log('[ConfigModal] 📤 Auto-processing document:', this.iframeGuideDocFile.name);
        
        // Determine file type
        const fileName = this.iframeGuideDocFile.name.toLowerCase();
        let fileType: 'pdf' | 'text' = 'text';
        if (fileName.endsWith('.pdf')) {
          fileType = 'pdf';
        } else if (fileName.endsWith('.txt')) {
          fileType = 'text';
        } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
          // For DOCX, we'll treat as text for now (backend will handle conversion)
          fileType = 'text';
        }

        // Create FormData for content source creation with file
        const contentFormData = new FormData();
        contentFormData.append('file', this.iframeGuideDocFile);
        contentFormData.append('type', fileType);
        contentFormData.append('title', `iFrame Guide: ${this.iframeGuideDocFile.name}`);
        contentFormData.append('metadata', JSON.stringify({
          source: 'iframe-guide',
          interactionType: this.interactionType,
          fileName: this.iframeGuideDocFile.name,
        }));

        // Upload file and create content source in one request
        const uploadResponse = await this.http.post<any>(`${environment.apiUrl}/content-sources/upload-file`, contentFormData).toPromise();
        console.log('[ConfigModal] ✅ File uploaded and content source created:', uploadResponse);

        const contentSourceId = uploadResponse.id || uploadResponse.contentSourceId;
        
        if (!contentSourceId) {
          throw new Error('Failed to create content source from file upload');
        }

        // Link to lesson
        await this.contentSourceService.linkToLesson(this.lessonId, contentSourceId);
        console.log('[ConfigModal] ✅ Linked to lesson:', this.lessonId);

        // Submit for approval (which triggers processing)
        await this.contentSourceService.submitForApproval(contentSourceId);
        console.log('[ConfigModal] ✅ Submitted for approval and processing');

        // Store the content source ID in config for reference
        this.config.iframeGuideDocUrl = contentSourceId;
        this.config.iframeGuideDocFileName = this.iframeGuideDocFile.name;
        this.config.iframeGuideDocContentSourceId = contentSourceId; // Track that it's been processed

        // Clear the file reference since it's been processed
        this.iframeGuideDocFile = null;
        
        // Update initial snapshot since we've made a change
        this.initialConfigSnapshot = JSON.parse(JSON.stringify(this.config));
      } catch (error: any) {
        console.error('[ConfigModal] ❌ Failed to upload document:', error);
        // If upload endpoint doesn't exist, try alternative approach
        if (error?.status === 404 || error?.error?.message?.includes('not found')) {
          console.log('[ConfigModal] ⚠️ Upload endpoint not found, trying alternative approach...');
          alert(`⚠️ File upload endpoint not available. Please use the Content Library to upload documents first, then link them to this lesson.`);
        } else {
          alert(`❌ Failed to upload document: ${error?.message || 'Unknown error'}`);
        }
        this.uploadingDocument = false;
        return; // Don't save config if upload failed
      } finally {
        this.uploadingDocument = false;
      }
    }

    // Automatically process webpage URL if present and not already processed
    if (this.config.iframeGuideWebpageUrl && this.lessonId && !this.processingWebpage) {
      // Check if URL hasn't been processed yet (no content source ID stored)
      const urlAlreadyProcessed = this.config.iframeGuideWebpageContentSourceId;
      
      if (!urlAlreadyProcessed) {
        try {
          console.log('[ConfigModal] 🌐 Auto-processing webpage URL:', this.config.iframeGuideWebpageUrl);
          await this.processWebpageUrl();
          console.log('[ConfigModal] ✅ Webpage auto-processed and linked to lesson');
        } catch (error: any) {
          console.error('[ConfigModal] ❌ Failed to auto-process webpage:', error);
          // Continue with save even if URL processing fails - user can manually process later
        }
      }
    }

    // Update initial snapshot after successful save
    this.initialConfigSnapshot = JSON.parse(JSON.stringify(this.config));
    
    // Emit saved event but don't close modal - let parent component handle it if needed
    this.saved.emit(this.config);
    
    // Show success message
    console.log('[ConfigModal] ✅ Configuration saved successfully');
  }
}


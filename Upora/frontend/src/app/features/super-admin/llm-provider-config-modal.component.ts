import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ModelPreset {
  modelName: string;
  displayName: string;
  costPerMillionTokens: number;
  maxTokens: number;
  defaultTemperature: number;
  supportsStreaming?: boolean;
  supportsVision?: boolean;
  contextWindow?: number;
}

interface ProviderPresets {
  providerType: string;
  displayName: string;
  defaultEndpoint: string;
  models: ModelPreset[];
}

interface LlmProviderForm {
  id?: string;
  name: string;
  providerType: string;
  apiEndpoint: string;
  apiKey: string;
  modelName: string;
  costPerMillionTokens: number;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
  isDefault: boolean;
  config?: any;
}

interface LlmProvider {
  id: string;
  name: string;
  providerType: string;
  apiEndpoint: string;
  apiKey: string;
  modelName: string;
  costPerMillionTokens: number;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
  isDefault: boolean;
  config?: any;
}

@Component({
  selector: 'app-llm-provider-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ isEditMode ? 'Configure' : 'Add' }} LLM Provider</h2>
          <button class="close-btn" (click)="close()">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Provider Name *</label>
            <input 
              type="text" 
              [(ngModel)]="formData.name" 
              placeholder="e.g., xAI Grok Beta"
              class="form-input"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Provider Type *</label>
              <select 
                [(ngModel)]="formData.providerType" 
                (change)="onProviderTypeChange()"
                class="form-select"
              >
                <option value="">-- Select Provider --</option>
                <option value="xai">xAI</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="other">Other (Manual Config)</option>
              </select>
            </div>

            <div class="form-group" *ngIf="formData.providerType && formData.providerType !== 'other'">
              <label>Model *</label>
              <select 
                [(ngModel)]="selectedModelPreset" 
                (change)="onModelSelect()"
                class="form-select"
              >
                <option [ngValue]="null">-- Select Model --</option>
                <option *ngFor="let model of availableModels" [ngValue]="model">
                  {{ model.displayName }} (\${{ model.costPerMillionTokens }}/1M)
                </option>
              </select>
            </div>

            <div class="form-group" *ngIf="formData.providerType === 'other'">
              <label>Model Name *</label>
              <input 
                type="text" 
                [(ngModel)]="formData.modelName" 
                placeholder="e.g., custom-model-v1"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label>API Endpoint *</label>
            <input 
              type="text" 
              [(ngModel)]="formData.apiEndpoint" 
              placeholder="https://api.x.ai/v1/chat/completions"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label>API Key *</label>
            <div class="input-with-toggle">
              <input 
                [type]="showApiKey ? 'text' : 'password'"
                [(ngModel)]="formData.apiKey" 
                placeholder="Enter API key"
                class="form-input"
              />
              <button 
                type="button" 
                class="toggle-visibility-btn" 
                (click)="showApiKey = !showApiKey"
              >
                {{ showApiKey ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Cost per 1M Tokens ($) *</label>
              <input 
                type="number" 
                step="0.01"
                [(ngModel)]="formData.costPerMillionTokens" 
                placeholder="5.00"
                class="form-input"
                [readonly]="usingPreset"
                [class.readonly-field]="usingPreset"
              />
              <div *ngIf="usingPreset" class="field-hint">✓ Auto-filled from model preset</div>
            </div>

            <div class="form-group">
              <label>Max Tokens</label>
              <input 
                type="number" 
                [(ngModel)]="formData.maxTokens" 
                placeholder="4096"
                class="form-input"
                [readonly]="usingPreset"
                [class.readonly-field]="usingPreset"
              />
              <div *ngIf="usingPreset" class="field-hint">✓ Auto-filled from model preset</div>
            </div>

            <div class="form-group">
              <label>Temperature</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                max="2"
                [(ngModel)]="formData.temperature" 
                placeholder="0.7"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="formData.isActive" />
              <span>Active (provider can be used)</span>
            </label>
          </div>

          <div *ngIf="testResult" class="test-result" [class.success]="testResult.success" [class.error]="!testResult.success">
            {{ testResult.message }}
          </div>
        </div>

        <div class="modal-footer">
          <button *ngIf="isEditMode" class="btn-test" (click)="testConnection()" [disabled]="testing">
            {{ testing ? 'Testing...' : 'Test Connection' }}
          </button>
          <button class="btn-secondary" (click)="close()">Cancel</button>
          <button class="btn-primary" (click)="save()" [disabled]="saving || !isFormValid()">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 8px;
    }

    .modal-content {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-header h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 2rem;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .close-btn:hover {
      color: #ffffff;
    }

    .modal-body {
      padding: 2rem;
      overflow-y: auto;
      flex: 1;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: #00d4ff;
      margin-bottom: 0.5rem;
    }

    .form-input, .form-select {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 0.75rem;
      color: #ffffff;
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #00d4ff;
      box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
    }

    .form-input::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .form-input.readonly-field {
      background: rgba(0, 212, 255, 0.05);
      border-color: rgba(0, 212, 255, 0.3);
      cursor: not-allowed;
      opacity: 0.8;
    }

    .field-hint {
      font-size: 0.75rem;
      color: #00d4ff;
      margin-top: 0.25rem;
    }

    .input-with-toggle {
      position: relative;
    }

    .toggle-visibility-btn {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }

    .toggle-visibility-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .checkbox-group {
      margin-top: 1rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.8);
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .test-result {
      margin-top: 1rem;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .test-result.success {
      background: rgba(76, 175, 80, 0.2);
      border: 1px solid #4caf50;
      color: #4caf50;
    }

    .test-result.error {
      background: rgba(244, 67, 54, 0.2);
      border: 1px solid #f44336;
      color: #f44336;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-test, .btn-secondary, .btn-primary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-test {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-test:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .btn-primary {
      background: #00d4ff;
      color: #0f0f23;
    }

    .btn-primary:hover:not(:disabled) {
      background: #00bce6;
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
    }

    .btn-test:disabled, .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .modal-content {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
      }

      .modal-header, .modal-body, .modal-footer {
        padding: 1.5rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .modal-footer {
        flex-direction: column;
      }

      .btn-test, .btn-secondary, .btn-primary {
        width: 100%;
      }
    }
  `]
})
export class LlmProviderConfigModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() provider: LlmProvider | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<LlmProvider>();

  formData: LlmProviderForm = this.getEmptyForm();
  isEditMode = false;
  showApiKey = false;
  testing = false;
  saving = false;
  testResult: { success: boolean; message: string } | null = null;
  
  allPresets: ProviderPresets[] = [];
  availableModels: ModelPreset[] = [];
  selectedModelPreset: ModelPreset | null = null;
  usingPreset = false;

  constructor(private http: HttpClient) {}

  async ngOnInit() {
    await this.loadPresets();
  }

  async loadPresets() {
    if (this.allPresets.length > 0) return; // Already loaded
    
    try {
      this.allPresets = await this.http.get<ProviderPresets[]>(
        `${environment.apiUrl}/super-admin/llm-providers/presets`
      ).toPromise() as ProviderPresets[];
      console.log('[LlmProviderModal] Presets loaded:', this.allPresets);
    } catch (error) {
      console.error('[LlmProviderModal] Failed to load presets:', error);
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['provider'] || changes['isOpen']) {
      if (this.isOpen) {
        // Load presets if not already loaded
        await this.loadPresets();

        // Hide header and lock body scroll when modal opens
        document.body.style.overflow = 'hidden';
        const header = document.querySelector('app-header');
        if (header) {
          (header as HTMLElement).style.display = 'none';
        }

        if (this.provider) {
          this.isEditMode = true;
          this.formData = { ...this.provider };
        } else {
          this.isEditMode = false;
          this.formData = this.getEmptyForm();
        }
        this.testResult = null;
        this.showApiKey = false;
      } else {
        // Restore header and body scroll when modal closes
        document.body.style.overflow = '';
        const header = document.querySelector('app-header');
        if (header) {
          (header as HTMLElement).style.display = '';
        }
      }
    }
  }

  getEmptyForm(): LlmProviderForm {
    return {
      name: '',
      providerType: 'xai',
      apiEndpoint: '',
      apiKey: '',
      modelName: '',
      costPerMillionTokens: 5.0,
      maxTokens: 4096,
      temperature: 0.7,
      isActive: true,
      isDefault: false,
    };
  }

  onProviderTypeChange() {
    console.log('[LlmProviderModal] Provider type changed to:', this.formData.providerType);
    console.log('[LlmProviderModal] All presets:', this.allPresets);
    
    const providerPreset = this.allPresets.find(p => p.providerType === this.formData.providerType);
    
    console.log('[LlmProviderModal] Found preset:', providerPreset);
    
    if (providerPreset) {
      this.availableModels = providerPreset.models;
      this.formData.apiEndpoint = providerPreset.defaultEndpoint;
      this.selectedModelPreset = null;
      this.usingPreset = false;
      console.log('[LlmProviderModal] Available models:', this.availableModels);
    } else {
      this.availableModels = [];
      this.selectedModelPreset = null;
      this.usingPreset = false;
      console.log('[LlmProviderModal] No preset found for provider type');
    }
  }

  onModelSelect() {
    if (this.selectedModelPreset) {
      // Auto-fill from preset
      this.formData.modelName = this.selectedModelPreset.modelName;
      this.formData.name = this.selectedModelPreset.displayName;
      this.formData.costPerMillionTokens = this.selectedModelPreset.costPerMillionTokens;
      this.formData.maxTokens = this.selectedModelPreset.maxTokens;
      this.formData.temperature = this.selectedModelPreset.defaultTemperature;
      
      if (this.selectedModelPreset.supportsStreaming !== undefined) {
        this.formData.config = {
          ...this.formData.config,
          supportsStreaming: this.selectedModelPreset.supportsStreaming,
          supportsVision: this.selectedModelPreset.supportsVision,
          contextWindow: this.selectedModelPreset.contextWindow,
        };
      }
      
      this.usingPreset = true;
      console.log('[LlmProviderModal] Model preset applied:', this.selectedModelPreset);
    } else {
      this.usingPreset = false;
    }
  }

  isFormValid(): boolean {
    return !!(
      this.formData.name &&
      this.formData.providerType &&
      this.formData.apiEndpoint &&
      this.formData.apiKey &&
      this.formData.modelName &&
      this.formData.costPerMillionTokens > 0
    );
  }

  async testConnection() {
    if (!this.formData.id) return;

    this.testing = true;
    this.testResult = null;

    try {
      const result = await this.http.post<{ success: boolean; message: string }>(
        `${environment.apiUrl}/super-admin/llm-providers/${this.formData.id}/test`,
        {}
      ).toPromise();

      this.testResult = result || { success: false, message: 'No response from server' };
    } catch (error: any) {
      this.testResult = {
        success: false,
        message: error.error?.message || 'Connection test failed'
      };
    } finally {
      this.testing = false;
    }
  }

  async save() {
    if (!this.isFormValid()) return;

    this.saving = true;

    try {
      let result: LlmProvider;

      if (this.isEditMode && this.formData.id) {
        // Update existing
        result = await this.http.put<LlmProvider>(
          `${environment.apiUrl}/super-admin/llm-providers/${this.formData.id}`,
          this.formData
        ).toPromise() as LlmProvider;
      } else {
        // Create new
        result = await this.http.post<LlmProvider>(
          `${environment.apiUrl}/super-admin/llm-providers`,
          this.formData
        ).toPromise() as LlmProvider;
      }

      this.saved.emit(result);
      this.close();
    } catch (error: any) {
      alert(`Failed to save provider: ${error.error?.message || 'Unknown error'}`);
    } finally {
      this.saving = false;
    }
  }

  close() {
    // Restore header and body scroll
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = '';
    }
    
    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}


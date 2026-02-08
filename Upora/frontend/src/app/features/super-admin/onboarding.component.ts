import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';

interface PopularItem {
  id: string;
  label: string;
  count: number;
}

interface PopularSelections {
  tv_movies: PopularItem[];
  hobbies: PopularItem[];
  learning_areas: PopularItem[];
}

interface OptionItem {
  id: string;
  label: string;
}

interface VariantRow {
  ageRange: string;
  gender: string;
  options: OptionItem[];
}

interface OnboardingOptionsResponse {
  [category: string]: VariantRow[];
}

const CATEGORIES = ['tv_movies', 'hobbies', 'learning_areas'] as const;
type CategoryKey = (typeof CATEGORIES)[number];

const AGE_RANGES: { value: string; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'under-18', label: 'Under 18' },
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45-54', label: '45–54' },
  { value: '55+', label: '55+' },
];

const GENDERS: { value: string; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'option';
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content [style.--padding-top]="'80px'">
      <div class="onboarding-page">
        <div class="page-header">
          <button class="back-btn" (click)="goBack()">← Back to Dashboard</button>
          <div class="header-content">
            <div>
              <h1>📋 Onboarding</h1>
              <p class="subtitle">Popular selections & option configuration</p>
              <p *ngIf="lastUpdated" class="last-updated">Last updated: {{ lastUpdated | date:'short' }}</p>
            </div>
            <button class="refresh-btn" (click)="load()" [disabled]="loading" [class.spinning]="loading">
              🔄 {{ loading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
        </div>

        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading onboarding data...</p>
        </div>

        <div *ngIf="error" class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>Failed to load</h3>
          <p>{{ error }}</p>
          <button class="retry-btn" (click)="load()">Retry</button>
        </div>

        <div *ngIf="!loading && !error" class="content">
          <!-- Section: Popular Selections -->
          <section class="section">
            <h2 class="section-title">📊 Most Popular Selections</h2>
            <p class="section-desc">What users chose during onboarding (aggregated across all users)</p>
            <div class="popular-grid">
              <div class="popular-card">
                <h3>TV & Movies</h3>
                <div class="popular-list" *ngIf="popular?.tv_movies?.length; else noTv">
                  <div *ngFor="let item of popular?.tv_movies | slice:0:15" class="popular-item">
                    <span class="label">{{ item.label }}</span>
                    <span class="count">{{ item.count }}</span>
                  </div>
                </div>
                <ng-template #noTv><p class="empty">No selections yet</p></ng-template>
              </div>
              <div class="popular-card">
                <h3>Hobbies</h3>
                <div class="popular-list" *ngIf="popular?.hobbies?.length; else noHobbies">
                  <div *ngFor="let item of popular?.hobbies | slice:0:15" class="popular-item">
                    <span class="label">{{ item.label }}</span>
                    <span class="count">{{ item.count }}</span>
                  </div>
                </div>
                <ng-template #noHobbies><p class="empty">No selections yet</p></ng-template>
              </div>
              <div class="popular-card">
                <h3>Learning Areas</h3>
                <div class="popular-list" *ngIf="popular?.learning_areas?.length; else noLearning">
                  <div *ngFor="let item of popular?.learning_areas | slice:0:15" class="popular-item">
                    <span class="label">{{ item.label }}</span>
                    <span class="count">{{ item.count }}</span>
                  </div>
                </div>
                <ng-template #noLearning><p class="empty">No selections yet</p></ng-template>
              </div>
            </div>
          </section>

          <!-- Section: Option Configuration -->
          <section class="section">
            <h2 class="section-title">⚙️ Option Configuration</h2>
            <p class="section-desc">Add or remove options for each category. Configure default list and age/gender variants. Fallback: age+gender → age → gender → default.</p>
            <div class="options-editor" *ngIf="optionsData">
              <div class="option-category" *ngFor="let cat of categoryKeys">
                <h3 class="cat-title">{{ categoryLabels[cat] }}</h3>
                <!-- Default variant -->
                <div class="variant-block default-variant">
                  <h4 class="variant-label">Default (any age, any gender)</h4>
                  <div class="add-row">
                    <input
                      type="text"
                      [(ngModel)]="newOptionLabel[cat]"
                      (keyup.enter)="addOption(cat, '', '')"
                      placeholder="New option label"
                      class="add-input"
                    />
                    <button type="button" (click)="addOption(cat, '', '')" [disabled]="!newOptionLabel[cat]?.trim() || isSaving(cat, '', '')" class="add-btn">
                      {{ isSaving(cat, '', '') ? 'Saving...' : 'Add' }}
                    </button>
                  </div>
                  <ul class="option-list">
                    <li *ngFor="let opt of getDefaultOptions(cat)" class="option-row">
                      <span class="opt-label">{{ opt.label }}</span>
                      <button type="button" (click)="removeOption(cat, opt.id, '', '')" [disabled]="isSaving(cat, '', '')" class="remove-btn" title="Remove">×</button>
                    </li>
                  </ul>
                  <p class="opt-count">{{ getDefaultOptions(cat).length }} options</p>
                </div>
                <!-- Variants by age/gender -->
                <div class="variants-section">
                  <h4 class="variant-label">Variants (age range / gender)</h4>
                  <div *ngFor="let v of getVariants(cat)" class="variant-row">
                    <span class="variant-badge">{{ formatVariant(v) }}</span>
                    <span class="variant-opt-count">{{ v.options.length }} options</span>
                    <button type="button" (click)="editVariant(cat, v)" class="edit-variant-btn">Edit</button>
                    <button type="button" (click)="deleteVariant(cat, v)" class="delete-variant-btn" title="Delete variant">×</button>
                  </div>
                  <div class="add-variant-row" *ngIf="!addingVariant[cat]">
                    <button type="button" (click)="startAddVariant(cat)" class="add-variant-btn">+ Add variant</button>
                  </div>
                  <div class="add-variant-form" *ngIf="addingVariant[cat]">
                    <select [(ngModel)]="newVariantAgeRange[cat]" class="variant-select">
                      <option *ngFor="let a of AGE_RANGES" [value]="a.value">{{ a.label }}</option>
                    </select>
                    <select [(ngModel)]="newVariantGender[cat]" class="variant-select">
                      <option *ngFor="let g of GENDERS" [value]="g.value">{{ g.label }}</option>
                    </select>
                    <button type="button" (click)="createVariant(cat)" [disabled]="!canCreateVariant(cat)" class="add-btn">Create</button>
                    <button type="button" (click)="cancelAddVariant(cat)" class="cancel-btn">Cancel</button>
                  </div>
                </div>
                <!-- Edit variant modal (inline) -->
                <div class="edit-variant-panel" *ngIf="editingVariant[cat]">
                  <h4 class="variant-label">Edit {{ formatVariant(editingVariant[cat]!) }}</h4>
                  <div class="add-row">
                    <input
                      type="text"
                      [(ngModel)]="editNewOptionLabel[cat]"
                      (keyup.enter)="addOptionToVariant(cat)"
                      placeholder="New option label"
                      class="add-input"
                    />
                    <button type="button" (click)="addOptionToVariant(cat)" [disabled]="!editNewOptionLabel[cat]?.trim() || isSavingVariant(cat)" class="add-btn">Add</button>
                  </div>
                  <ul class="option-list">
                    <li *ngFor="let opt of editingVariant[cat]!.options" class="option-row">
                      <span class="opt-label">{{ opt.label }}</span>
                      <button type="button" (click)="removeOptionFromVariant(cat, opt.id)" [disabled]="isSavingVariant(cat)" class="remove-btn" title="Remove">×</button>
                    </li>
                  </ul>
                  <button type="button" (click)="closeEditVariant(cat)" class="close-edit-btn">Close</button>
                </div>
              </div>
            </div>
          </section>

          <!-- Placeholder: Future extensibility -->
          <section class="section future">
            <h2 class="section-title">🔮 Future Configuration</h2>
            <p class="section-desc">Placeholder for: onboarding flow order, required vs optional steps, A/B tests, etc.</p>
          </section>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .onboarding-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      padding: 2rem;
    }
    .page-header {
      margin-bottom: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .back-btn {
      align-self: flex-start;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .back-btn:hover {
      background: rgba(255,255,255,0.12);
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header-content h1 { font-size: 2rem; color: #fff; margin: 0 0 0.25rem 0; }
    .subtitle { color: rgba(255,255,255,0.6); margin: 0; font-size: 0.95rem; }
    .last-updated { color: rgba(255,255,255,0.4); margin: 0.25rem 0 0 0; font-size: 0.85rem; }
    .refresh-btn {
      background: rgba(0,212,255,0.2);
      border: 1px solid #00d4ff;
      color: #00d4ff;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .refresh-btn:hover:not(:disabled) { background: rgba(0,212,255,0.3); }
    .refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .refresh-btn.spinning { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-state, .error-state {
      text-align: center;
      padding: 3rem;
      color: rgba(255,255,255,0.7);
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #00d4ff;
      border-radius: 50%;
      margin: 0 auto 1rem;
      animation: spin 0.8s linear infinite;
    }
    .error-icon { font-size: 3rem; margin-bottom: 0.5rem; }
    .retry-btn {
      margin-top: 1rem;
      background: #00d4ff;
      color: #0f0f23;
      border: none;
      padding: 0.5rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    .content { max-width: 1200px; margin: 0 auto; }
    .section {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 1.5rem 2rem;
      margin-bottom: 1.5rem;
    }
    .section-title { font-size: 1.25rem; color: #fff; margin: 0 0 0.5rem 0; }
    .section-desc { color: rgba(255,255,255,0.5); margin: 0 0 1rem 0; font-size: 0.9rem; }
    .popular-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    .popular-card {
      background: rgba(0,0,0,0.2);
      border-radius: 12px;
      padding: 1rem;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .popular-card h3 { font-size: 1rem; color: rgba(255,255,255,0.9); margin: 0 0 0.75rem 0; }
    .popular-list { max-height: 280px; overflow-y: auto; }
    .popular-item {
      display: flex;
      justify-content: space-between;
      padding: 0.35rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 0.9rem;
    }
    .popular-item .label { color: rgba(255,255,255,0.85); }
    .popular-item .count {
      color: #00d4ff;
      font-weight: 600;
      margin-left: 0.5rem;
    }
    .empty { color: rgba(255,255,255,0.4); font-size: 0.9rem; margin: 0; }
    .options-summary {
      display: flex;
      gap: 2rem;
      margin-bottom: 1rem;
    }
    .options-editor {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .option-category {
      background: rgba(0,0,0,0.2);
      border-radius: 12px;
      padding: 1rem;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .cat-title { font-size: 1rem; color: rgba(255,255,255,0.9); margin: 0 0 0.75rem 0; }
    .add-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .add-input {
      flex: 1;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      color: #fff;
      font-size: 0.9rem;
    }
    .add-input::placeholder { color: rgba(255,255,255,0.4); }
    .add-btn {
      background: rgba(0,212,255,0.2);
      border: 1px solid #00d4ff;
      color: #00d4ff;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .add-btn:hover:not(:disabled) { background: rgba(0,212,255,0.3); }
    .add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .option-list {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 240px;
      overflow-y: auto;
    }
    .option-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 0.9rem;
    }
    .opt-label { color: rgba(255,255,255,0.85); }
    .remove-btn {
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
      padding: 0 0.25rem;
    }
    .remove-btn:hover:not(:disabled) { color: #ff6b6b; }
    .remove-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .opt-count { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0.5rem 0 0 0; }
    .variant-block { margin-bottom: 1rem; }
    .default-variant { border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1rem; }
    .variant-label { font-size: 0.9rem; color: rgba(255,255,255,0.7); margin: 0 0 0.5rem 0; }
    .variants-section { margin-top: 0.75rem; }
    .variant-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0;
      font-size: 0.9rem;
    }
    .variant-badge { color: rgba(255,255,255,0.85); }
    .variant-opt-count { color: rgba(255,255,255,0.5); font-size: 0.85rem; }
    .edit-variant-btn, .delete-variant-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0 0.35rem;
    }
    .edit-variant-btn { color: #00d4ff; }
    .delete-variant-btn { color: rgba(255,255,255,0.5); }
    .delete-variant-btn:hover { color: #ff6b6b; }
    .add-variant-row { margin-top: 0.5rem; }
    .add-variant-btn {
      background: rgba(0,212,255,0.15);
      border: 1px dashed #00d4ff;
      color: #00d4ff;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .add-variant-btn:hover { background: rgba(0,212,255,0.25); }
    .add-variant-form {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }
    .variant-select {
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      padding: 0.35rem 0.5rem;
      color: #fff;
      font-size: 0.85rem;
    }
    .cancel-btn {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.3);
      color: rgba(255,255,255,0.7);
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .edit-variant-panel {
      margin-top: 1rem;
      padding: 1rem;
      background: rgba(0,0,0,0.25);
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .close-edit-btn {
      margin-top: 0.5rem;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.3);
      color: rgba(255,255,255,0.8);
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .section.future { opacity: 0.7; }
  `],
})
export class OnboardingComponent implements OnInit {
  loading = false;
  error: string | null = null;
  popular: PopularSelections | null = null;
  optionsData: OnboardingOptionsResponse | null = null;
  lastUpdated: Date | null = null;
  savingKey = ''; // 'cat' or 'cat|age|gender'
  newOptionLabel: Record<CategoryKey, string> = { tv_movies: '', hobbies: '', learning_areas: '' };
  addingVariant: Record<CategoryKey, boolean> = { tv_movies: false, hobbies: false, learning_areas: false };
  newVariantAgeRange: Record<CategoryKey, string> = { tv_movies: '', hobbies: '', learning_areas: '' };
  newVariantGender: Record<CategoryKey, string> = { tv_movies: '', hobbies: '', learning_areas: '' };
  editingVariant: Record<CategoryKey, VariantRow | null> = { tv_movies: null, hobbies: null, learning_areas: null };
  editNewOptionLabel: Record<CategoryKey, string> = { tv_movies: '', hobbies: '', learning_areas: '' };

  categoryKeys = CATEGORIES;
  categoryLabels: Record<CategoryKey, string> = {
    tv_movies: 'TV & Movies',
    hobbies: 'Hobbies',
    learning_areas: 'Learning Areas',
  };
  AGE_RANGES = AGE_RANGES;
  GENDERS = GENDERS;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit() {
    this.load();
  }

  goBack() {
    this.router.navigate(['/super-admin']);
  }

  getDefaultOptions(cat: CategoryKey): OptionItem[] {
    const v = this.getVariant(cat, '', '');
    return v?.options ?? [];
  }

  getVariants(cat: CategoryKey): VariantRow[] {
    const arr = this.optionsData?.[cat] ?? [];
    return arr.filter((v) => v.ageRange || v.gender);
  }

  getVariant(cat: CategoryKey, ageRange: string, gender: string): VariantRow | undefined {
    const arr = this.optionsData?.[cat] ?? [];
    return arr.find((v) => v.ageRange === (ageRange || '') && v.gender === (gender || ''));
  }

  formatVariant(v: VariantRow): string {
    const age = v.ageRange || 'any';
    const gen = v.gender || 'any';
    return `${age} / ${gen}`;
  }

  isSaving(cat: CategoryKey, ageRange: string, gender: string): boolean {
    return this.savingKey === `${cat}|${ageRange || ''}|${gender || ''}`;
  }

  isSavingVariant(cat: CategoryKey): boolean {
    const v = this.editingVariant[cat];
    return v ? this.isSaving(cat, v.ageRange, v.gender) : false;
  }

  addOption(cat: CategoryKey, ageRange: string, gender: string) {
    const label = this.newOptionLabel[cat]?.trim();
    if (!label || !this.optionsData) return;
    const v = this.getVariant(cat, ageRange, gender);
    const opts = v?.options ?? [];
    const id = slugify(label);
    if (opts.some((o) => o.id === id)) return;
    const updated = [...opts, { id, label }];
    this.saveCategory(cat, updated, ageRange, gender);
    this.newOptionLabel[cat] = '';
  }

  removeOption(cat: CategoryKey, id: string, ageRange: string, gender: string) {
    if (!this.optionsData) return;
    const v = this.getVariant(cat, ageRange, gender);
    const opts = (v?.options ?? []).filter((o) => o.id !== id);
    this.saveCategory(cat, opts, ageRange, gender);
  }

  startAddVariant(cat: CategoryKey) {
    this.addingVariant[cat] = true;
    this.newVariantAgeRange[cat] = '';
    this.newVariantGender[cat] = '';
  }

  cancelAddVariant(cat: CategoryKey) {
    this.addingVariant[cat] = false;
  }

  canCreateVariant(cat: CategoryKey): boolean {
    const age = this.newVariantAgeRange[cat]?.trim() ?? '';
    const gen = this.newVariantGender[cat]?.trim() ?? '';
    if (!age && !gen) return false;
    return !this.getVariant(cat, age, gen);
  }

  createVariant(cat: CategoryKey) {
    if (!this.canCreateVariant(cat)) return;
    const age = this.newVariantAgeRange[cat]?.trim() ?? '';
    const gen = this.newVariantGender[cat]?.trim() ?? '';
    this.saveCategory(cat, [], age, gen);
    this.addingVariant[cat] = false;
  }

  editVariant(cat: CategoryKey, v: VariantRow) {
    this.editingVariant[cat] = { ...v, options: [...v.options] };
    this.editNewOptionLabel[cat] = '';
  }

  closeEditVariant(cat: CategoryKey) {
    this.editingVariant[cat] = null;
  }

  addOptionToVariant(cat: CategoryKey) {
    const v = this.editingVariant[cat];
    if (!v || !this.editNewOptionLabel[cat]?.trim()) return;
    const id = slugify(this.editNewOptionLabel[cat].trim());
    if (v.options.some((o) => o.id === id)) return;
    const updated = [...v.options, { id, label: this.editNewOptionLabel[cat].trim() }];
    this.editingVariant[cat] = { ...v, options: updated };
    this.saveCategory(cat, updated, v.ageRange, v.gender);
    this.editNewOptionLabel[cat] = '';
  }

  removeOptionFromVariant(cat: CategoryKey, id: string) {
    const v = this.editingVariant[cat];
    if (!v) return;
    const updated = v.options.filter((o) => o.id !== id);
    this.editingVariant[cat] = { ...v, options: updated };
    this.saveCategory(cat, updated, v.ageRange, v.gender);
  }

  deleteVariant(cat: CategoryKey, v: VariantRow) {
    if (!confirm(`Delete variant ${this.formatVariant(v)}?`)) return;
    const key = `${cat}|${v.ageRange}|${v.gender}`;
    this.savingKey = key;
    this.http
      .delete(
        `${environment.apiUrl}/super-admin/onboarding/options/${cat}?ageRange=${encodeURIComponent(v.ageRange)}&gender=${encodeURIComponent(v.gender)}`
      )
      .subscribe({
        next: () => {
          this.load();
          this.savingKey = '';
          if (this.editingVariant[cat]?.ageRange === v.ageRange && this.editingVariant[cat]?.gender === v.gender) {
            this.editingVariant[cat] = null;
          }
        },
        error: () => {
          this.savingKey = '';
          this.error = 'Failed to delete variant';
        },
      });
  }

  private saveCategory(cat: CategoryKey, opts: OptionItem[], ageRange = '', gender = '') {
    const key = `${cat}|${ageRange}|${gender}`;
    this.savingKey = key;
    this.http
      .patch(`${environment.apiUrl}/super-admin/onboarding/options/${cat}`, {
        options: opts,
        ageRange: ageRange || undefined,
        gender: gender || undefined,
      })
      .subscribe({
        next: () => {
          this.mergeOptionsData(cat, ageRange, gender, opts);
          this.savingKey = '';
          const ev = this.editingVariant[cat];
          if (ev && ev.ageRange === ageRange && ev.gender === gender) {
            this.editingVariant[cat] = { ...ev, options: opts };
          }
        },
        error: () => {
          this.savingKey = '';
          this.error = 'Failed to save options';
        },
      });
  }

  private mergeOptionsData(cat: CategoryKey, ageRange: string, gender: string, opts: OptionItem[]) {
    if (!this.optionsData) return;
    const arr = this.optionsData[cat] ?? [];
    const idx = arr.findIndex((v) => v.ageRange === (ageRange || '') && v.gender === (gender || ''));
    const row = { ageRange: ageRange || '', gender: gender || '', options: opts };
    if (idx >= 0) {
      arr[idx] = row;
    } else {
      arr.push(row);
      arr.sort((a, b) => (a.ageRange + a.gender).localeCompare(b.ageRange + b.gender));
    }
  }

  load() {
    this.loading = true;
    this.error = null;
    Promise.all([
      this.http.get<PopularSelections>(`${environment.apiUrl}/super-admin/onboarding/popular-selections`).toPromise(),
      this.http.get<OnboardingOptionsResponse>(`${environment.apiUrl}/super-admin/onboarding/options`).toPromise(),
    ])
      .then(([pop, opts]) => {
        this.popular = pop ?? null;
        this.optionsData = opts && Object.keys(opts).length ? opts : { tv_movies: [], hobbies: [], learning_areas: [] };
        this.lastUpdated = new Date();
      })
      .catch((err) => {
        this.error = err?.error?.message || err?.message || 'Failed to load';
      })
      .finally(() => {
        this.loading = false;
      });
  }
}

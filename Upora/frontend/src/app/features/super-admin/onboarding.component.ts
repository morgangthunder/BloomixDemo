import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

interface OnboardingOptions {
  tv_movies: { id: string; label: string }[];
  hobbies: { id: string; label: string }[];
  learning_areas: { id: string; label: string }[];
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, IonContent],
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

          <!-- Section: Option Configuration (extensible - add more config later) -->
          <section class="section">
            <h2 class="section-title">⚙️ Option Configuration</h2>
            <p class="section-desc">Current options shown to users during onboarding. Edit via database migration or future admin UI.</p>
            <div class="options-summary">
              <div class="option-stat">
                <span class="stat-value">{{ options?.tv_movies?.length ?? 0 }}</span>
                <span class="stat-label">TV/Movies options</span>
              </div>
              <div class="option-stat">
                <span class="stat-value">{{ options?.hobbies?.length ?? 0 }}</span>
                <span class="stat-label">Hobbies options</span>
              </div>
              <div class="option-stat">
                <span class="stat-value">{{ options?.learning_areas?.length ?? 0 }}</span>
                <span class="stat-label">Learning areas</span>
              </div>
            </div>
            <p class="hint">To update options: <code>Get-Content docker/postgres/init/06-personalization-options-update.sql | docker exec -i upora-postgres psql -U upora_user -d upora_dev</code> (or use future edit UI)</p>
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
    .option-stat {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: #00d4ff; }
    .stat-label { font-size: 0.85rem; color: rgba(255,255,255,0.5); }
    .hint { color: rgba(255,255,255,0.4); font-size: 0.8rem; margin: 0; }
    .hint code { background: rgba(0,0,0,0.3); padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.75rem; word-break: break-all; }
    .section.future { opacity: 0.7; }
  `],
})
export class OnboardingComponent implements OnInit {
  loading = false;
  error: string | null = null;
  popular: PopularSelections | null = null;
  options: OnboardingOptions | null = null;
  lastUpdated: Date | null = null;

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

  load() {
    this.loading = true;
    this.error = null;
    Promise.all([
      this.http.get<PopularSelections>(`${environment.apiUrl}/super-admin/onboarding/popular-selections`).toPromise(),
      this.http.get<OnboardingOptions>(`${environment.apiUrl}/super-admin/onboarding/options`).toPromise(),
    ])
      .then(([pop, opts]) => {
        this.popular = pop ?? null;
        this.options = opts ?? null;
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

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { LlmProviderConfigModalComponent } from './llm-provider-config-modal.component';

interface TokenUsageAccount {
  accountId: string;
  email: string;
  name: string;
  tenantId: string;
  subscriptionTier: string;
  tokenLimit: number;
  tokenUsed: number;
  tokenRemaining: number;
  percentUsed: number;
  willExceed: boolean;
  estimatedExceedDate: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  llmProvider: string;
  avgLatencyMs: number;
}

interface TokenUsageResponse {
  accounts: TokenUsageAccount[];
  totals: {
    totalUsed: number;
    totalLimit: number;
    estimatedCost: number;
    currency: string;
  };
  usageByCategory: Record<string, number>;
  pricing: {
    perMillionTokens: number;
    provider: string;
  };
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
  selector: 'app-llm-token-usage',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, LlmProviderConfigModalComponent],
  template: `
    <ion-content [style.--padding-top]="'80px'">
      <div class="llm-usage-page">
        <!-- Header with Back Button -->
        <div class="page-header">
          <button class="back-btn" (click)="goBack()">
            ← Back to Dashboard
          </button>
          <h1>🤖 LLM Token Usage</h1>
          <p class="subtitle">Monitor AI costs and consumption</p>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading token usage data...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>Failed to load data</h3>
          <p>{{ error }}</p>
          <button class="retry-btn" (click)="loadData()">Retry</button>
        </div>

        <!-- Data Loaded -->
        <div *ngIf="!loading && !error && data" class="usage-content">
          <!-- Summary Cards -->
          <div class="summary-cards">
            <div class="summary-card">
              <div class="card-label">Total Tokens Used</div>
              <div class="card-value">{{ formatNumber(data.totals.totalUsed) }}</div>
              <div class="card-subtext">This month</div>
            </div>

            <div class="summary-card">
              <div class="card-label">Total Limit</div>
              <div class="card-value">{{ formatNumber(data.totals.totalLimit) }}</div>
              <div class="card-subtext">Across all accounts</div>
            </div>

            <div class="summary-card highlight">
              <div class="card-label">Estimated Cost</div>
              <div class="card-value">\${{ data.totals.estimatedCost.toFixed(2) }}</div>
              <div class="card-subtext">{{ data.totals.currency }} @ \${{ data.pricing.perMillionTokens }}/1M tokens</div>
            </div>

            <div class="summary-card provider-card">
              <div class="card-label">Active Provider</div>
              <select 
                [(ngModel)]="selectedProviderId" 
                (change)="onProviderChange()"
                class="provider-dropdown"
              >
                <option *ngFor="let p of providers" [value]="p.id">
                  {{ p.name }}{{ p.isDefault ? ' ⭐ (Default)' : '' }}
                </option>
              </select>
              <div class="provider-actions">
                <button class="btn-add-provider" (click)="openAddProviderModal()" title="Add new provider">
                  <span class="btn-icon">+</span>
                </button>
                <button class="btn-configure" (click)="openConfigureModal()" [disabled]="!selectedProviderId">
                  Configure
                </button>
              </div>
            </div>
          </div>

          <!-- Provider Config Modal -->
          <app-llm-provider-config-modal
            [isOpen]="showProviderModal"
            [provider]="editingProvider"
            (closed)="closeProviderModal()"
            (saved)="onProviderSaved($event)"
          ></app-llm-provider-config-modal>

          <!-- Accounts Table -->
          <div class="accounts-section">
            <div class="section-header">
              <h2>Account Usage Breakdown</h2>
              <div class="account-count">{{ data.accounts.length }} accounts</div>
            </div>

            <div class="table-container">
              <table class="usage-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Subscription</th>
                    <th>Used / Limit</th>
                    <th>Progress</th>
                    <th>Remaining</th>
                    <th>Cost This Period</th>
                    <th>LLM Used</th>
                    <th>Avg Latency</th>
                    <th>Status</th>
                    <th>Quota Exceed Est.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let account of data.accounts" [class.warning]="account.percentUsed > 80">
                    <td>
                      <div class="account-cell">
                        <div class="account-name">{{ account.name }}</div>
                        <div class="account-email">{{ account.email }}</div>
                      </div>
                    </td>
                    <td>
                      <span class="subscription-badge" [class]="'tier-' + account.subscriptionTier">
                        {{ account.subscriptionTier }}
                      </span>
                    </td>
                    <td>
                      <div class="usage-numbers">
                        <span class="used">{{ formatNumber(account.tokenUsed) }}</span>
                        <span class="divider">/</span>
                        <span class="limit">{{ formatNumber(account.tokenLimit) }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="progress-cell">
                        <div class="progress-bar">
                          <div 
                            class="progress-fill" 
                            [style.width.%]="account.percentUsed"
                            [class.danger]="account.percentUsed > 90"
                            [class.warning]="account.percentUsed > 70 && account.percentUsed <= 90"
                          ></div>
                        </div>
                        <span class="progress-text">{{ account.percentUsed }}%</span>
                      </div>
                    </td>
                    <td>
                      <span class="remaining-tokens">{{ formatNumber(account.tokenRemaining) }}</span>
                    </td>
                    <td>
                      <div class="cost-cell">
                        <div class="cost-amount">\${{ calculateAccountCost(account.tokenUsed) }}</div>
                        <div class="cost-subtext">{{ data.totals.currency }}</div>
                      </div>
                    </td>
                    <td>
                      <div class="provider-cell">
                        <span class="provider-name">{{ account.llmProvider }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="latency-cell">
                        <span class="latency-value" [class.latency-good]="account.avgLatencyMs < 2000" [class.latency-slow]="account.avgLatencyMs >= 2000">
                          {{ account.avgLatencyMs > 0 ? account.avgLatencyMs + 'ms' : 'N/A' }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span 
                        class="status-badge" 
                        [class.status-danger]="account.willExceed"
                        [class.status-ok]="!account.willExceed"
                      >
                        {{ account.willExceed ? '⚠️ Will Exceed' : '✓ OK' }}
                      </span>
                    </td>
                    <td>
                      <div *ngIf="account.willExceed && account.estimatedExceedDate" class="exceed-info">
                        <div class="exceed-date-highlight">{{ account.estimatedExceedDate }}</div>
                        <div class="exceed-period">Before renewal ({{ account.currentPeriodEnd }})</div>
                      </div>
                      <div *ngIf="!account.willExceed" class="no-exceed">
                        <span class="safe-text">—</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Usage by Category (if any) -->
          <div *ngIf="hasCategoryData()" class="category-section">
            <h2>Usage by Category</h2>
            <div class="category-grid">
              <div *ngFor="let category of getCategoryData()" class="category-card">
                <div class="category-name">{{ category.name }}</div>
                <div class="category-tokens">{{ formatNumber(category.tokens) }} tokens</div>
                <div class="category-cost">\${{ ((category.tokens / 1000000) * data.pricing.perMillionTokens).toFixed(2) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
    }

    .llm-usage-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      padding: 2rem;
      padding-top: 1rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .back-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #00d4ff;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      margin-bottom: 1rem;
    }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: #00d4ff;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0.5rem 0;
    }

    .subtitle {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }

    /* Loading & Error States */
    .loading-state, .error-state {
      text-align: center;
      padding: 4rem 2rem;
      color: rgba(255, 255, 255, 0.8);
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-top-color: #00d4ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .retry-btn {
      background: #00d4ff;
      color: #0f0f23;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      margin-top: 1rem;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .summary-card.highlight {
      background: rgba(0, 212, 255, 0.1);
      border-color: rgba(0, 212, 255, 0.3);
    }

    .card-label {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0.5rem;
    }

    .card-value {
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.25rem;
    }

    .card-value.provider {
      font-size: 1.25rem;
    }

    .card-subtext {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .provider-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .provider-dropdown {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .provider-dropdown:focus {
      outline: none;
      border-color: #00d4ff;
    }

    .provider-dropdown option {
      background: #1a1a2e;
      color: #ffffff;
    }

    .provider-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-add-provider {
      width: 36px;
      height: 36px;
      background: rgba(0, 212, 255, 0.2);
      border: 1px solid #00d4ff;
      border-radius: 50%;
      color: #00d4ff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .btn-add-provider:hover {
      background: rgba(0, 212, 255, 0.3);
      transform: scale(1.05);
    }

    .btn-icon {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .btn-configure {
      flex: 1;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: #ffffff;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-configure:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
      border-color: #00d4ff;
    }

    .btn-configure:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Accounts Section */
    .accounts-section {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .section-header h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
    }

    .account-count {
      background: rgba(0, 212, 255, 0.2);
      color: #00d4ff;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
    }

    .usage-table {
      width: 100%;
      border-collapse: collapse;
    }

    .usage-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
      font-weight: 500;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .usage-table td {
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }

    .usage-table tr:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .usage-table tr.warning {
      background: rgba(255, 193, 7, 0.05);
    }

    .account-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .account-name {
      font-weight: 600;
      color: #ffffff;
    }

    .account-email {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .subscription-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .subscription-badge.tier-free {
      background: rgba(158, 158, 158, 0.2);
      color: #9e9e9e;
    }

    .subscription-badge.tier-pro {
      background: rgba(0, 212, 255, 0.2);
      color: #00d4ff;
    }

    .subscription-badge.tier-enterprise {
      background: rgba(255, 215, 0, 0.2);
      color: #ffd700;
    }

    .usage-numbers {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .used {
      font-weight: 600;
      color: #00d4ff;
    }

    .divider {
      color: rgba(255, 255, 255, 0.3);
    }

    .limit {
      color: rgba(255, 255, 255, 0.6);
    }

    .progress-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .progress-bar {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #00d4ff;
      transition: width 0.3s ease;
    }

    .progress-fill.warning {
      background: #ffc107;
    }

    .progress-fill.danger {
      background: #f44336;
    }

    .progress-text {
      font-size: 0.875rem;
      font-weight: 600;
      min-width: 45px;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge.status-ok {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .status-badge.status-danger {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }

    .exceed-date {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 0.25rem;
    }

    .exceed-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .exceed-date-highlight {
      font-size: 0.875rem;
      font-weight: 600;
      color: #f44336;
    }

    .exceed-period {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .no-exceed {
      text-align: center;
    }

    .safe-text {
      color: rgba(255, 255, 255, 0.3);
      font-size: 1.25rem;
    }

    .cost-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .cost-amount {
      font-size: 1rem;
      font-weight: 600;
      color: #00d4ff;
    }

    .cost-subtext {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .provider-cell {
      text-align: center;
    }

    .provider-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.8);
    }

    .latency-cell {
      text-align: center;
    }

    .latency-value {
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .latency-value.latency-good {
      color: #4caf50;
      background: rgba(76, 175, 80, 0.1);
    }

    .latency-value.latency-slow {
      color: #ff9800;
      background: rgba(255, 152, 0, 0.1);
    }

    /* Category Section */
    .category-section {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
    }

    .category-section h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 1.5rem 0;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    .category-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1rem;
    }

    .category-name {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0.5rem;
      text-transform: capitalize;
    }

    .category-tokens {
      font-size: 1.25rem;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 0.25rem;
    }

    .category-cost {
      font-size: 0.875rem;
      color: #00d4ff;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .llm-usage-page {
        padding: 1rem;
      }

      .summary-cards {
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .usage-table {
        font-size: 0.875rem;
      }

      .usage-table th,
      .usage-table td {
        padding: 0.5rem;
      }

      .accounts-section,
      .category-section {
        padding: 1rem;
      }
    }
  `]
})
export class LlmTokenUsageComponent implements OnInit {
  loading = true;
  error: string | null = null;
  data: TokenUsageResponse | null = null;
  providers: LlmProvider[] = [];
  selectedProviderId: string = '';
  showProviderModal = false;
  editingProvider: LlmProvider | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProviders();
    this.loadData();
  }

  async loadProviders() {
    try {
      this.providers = await this.http.get<LlmProvider[]>(
        `${environment.apiUrl}/super-admin/llm-providers`
      ).toPromise() as LlmProvider[];

      // Set selected to default provider
      const defaultProvider = this.providers.find(p => p.isDefault);
      if (defaultProvider) {
        this.selectedProviderId = defaultProvider.id;
      }

      console.log('[LLM Usage] Providers loaded:', this.providers);
    } catch (error) {
      console.error('[LLM Usage] Failed to load providers:', error);
    }
  }

  loadData() {
    this.loading = true;
    this.error = null;

    this.http.get<TokenUsageResponse>(`${environment.apiUrl}/super-admin/token-usage`)
      .subscribe({
        next: (response) => {
          this.data = response;
          this.loading = false;
          console.log('[LLM Usage] Data loaded:', response);
        },
        error: (err) => {
          this.error = err.message || 'Failed to load token usage data';
          this.loading = false;
          console.error('[LLM Usage] Error:', err);
        }
      });
  }

  goBack() {
    this.router.navigate(['/super-admin']);
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  hasCategoryData(): boolean {
    return this.data ? Object.keys(this.data.usageByCategory).length > 0 : false;
  }

  getCategoryData(): Array<{name: string; tokens: number}> {
    if (!this.data) return [];
    return Object.entries(this.data.usageByCategory).map(([name, tokens]) => ({
      name: name.replace(/-/g, ' '),
      tokens
    }));
  }

  calculateAccountCost(tokensUsed: number): string {
    if (!this.data) return '0.00';
    const cost = (tokensUsed / 1000000) * this.data.pricing.perMillionTokens;
    return cost.toFixed(2);
  }

  async onProviderChange() {
    console.log('[LLM Usage] Provider changed to:', this.selectedProviderId);
    
    // Set as default provider
    try {
      await this.http.put(
        `${environment.apiUrl}/super-admin/llm-providers/${this.selectedProviderId}/set-default`,
        {}
      ).toPromise();
      
      console.log('[LLM Usage] Default provider updated');
      this.loadData(); // Reload to update pricing
    } catch (error) {
      console.error('[LLM Usage] Failed to set default provider:', error);
    }
  }

  openAddProviderModal() {
    this.editingProvider = null;
    this.showProviderModal = true;
  }

  openConfigureModal() {
    const provider = this.providers.find(p => p.id === this.selectedProviderId);
    if (provider) {
      this.editingProvider = provider;
      this.showProviderModal = true;
    }
  }

  closeProviderModal() {
    this.showProviderModal = false;
    this.editingProvider = null;
  }

  async onProviderSaved(provider: LlmProvider) {
    console.log('[LLM Usage] Provider saved:', provider);
    await this.loadProviders();
    this.loadData();
  }
}


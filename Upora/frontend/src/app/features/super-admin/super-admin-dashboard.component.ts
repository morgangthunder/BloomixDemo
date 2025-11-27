import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, IonContent],
  template: `
    <ion-content [style.--padding-top]="'80px'">
      <div class="super-admin-dashboard">
        <!-- Header -->
        <div class="dashboard-header">
          <h1>🔧 Super Admin Dashboard</h1>
          <p class="subtitle">System administration and monitoring</p>
        </div>

        <!-- Dashboard Cards -->
        <div class="dashboard-grid">
          <!-- LLM Token Usage Card -->
          <div class="dashboard-card" (click)="navigateTo('/super-admin/llm-usage')">
            <div class="card-icon">🤖</div>
            <div class="card-content">
              <h3>LLM Token Usage</h3>
              <p>Monitor AI costs and token consumption by account</p>
              <div class="card-status active">Active Monitoring</div>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <!-- Placeholder: User Management -->
          <div class="dashboard-card disabled">
            <div class="card-icon">👥</div>
            <div class="card-content">
              <h3>User Management</h3>
              <p>Manage accounts, roles, and permissions</p>
              <div class="card-status">Coming Soon</div>
            </div>
          </div>

          <!-- Placeholder: System Health -->
          <div class="dashboard-card disabled">
            <div class="card-icon">📊</div>
            <div class="card-content">
              <h3>System Health</h3>
              <p>Monitor system performance and uptime</p>
              <div class="card-status">Coming Soon</div>
            </div>
          </div>

          <!-- Placeholder: Content Moderation -->
          <div class="dashboard-card disabled">
            <div class="card-icon">🛡️</div>
            <div class="card-content">
              <h3>Content Moderation</h3>
              <p>Review flagged content and user submissions</p>
              <div class="card-status">Coming Soon</div>
            </div>
          </div>

          <!-- Placeholder: Analytics -->
          <div class="dashboard-card disabled">
            <div class="card-icon">📈</div>
            <div class="card-content">
              <h3>Analytics</h3>
              <p>Platform usage and engagement metrics</p>
              <div class="card-status">Coming Soon</div>
            </div>
          </div>

          <!-- Placeholder: Billing -->
          <div class="dashboard-card disabled">
            <div class="card-icon">💳</div>
            <div class="card-content">
              <h3>Billing & Subscriptions</h3>
              <p>Manage subscriptions and payment processing</p>
              <div class="card-status">Coming Soon</div>
            </div>
          </div>

          <!-- AI Assistant Prompts Management -->
          <div class="dashboard-card" (click)="navigateTo('/super-admin/ai-prompts')">
            <div class="card-icon">🧠</div>
            <div class="card-content">
              <h3>AI Assistant Prompts</h3>
              <p>Configure prompts for Scaffolder, Lesson-builder, Teacher, Inventor, Optimiser, and Lesson Approver</p>
              <div class="card-status active">Active</div>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <!-- Approval Queue -->
          <div class="dashboard-card" (click)="navigateTo('/super-admin/approval-queue')">
            <div class="card-icon">✅</div>
            <div class="card-content">
              <h3>Approval Queue</h3>
              <p>Review lesson drafts and content, approve or reject changes</p>
              <div class="card-stats">
                <span class="stat-value" style="color: white;">{{pendingDraftsCount}}</span>
                <span class="stat-label" style="color: white;"> Pending</span>
              </div>
            </div>
          </div>

          <!-- Tests -->
          <div class="dashboard-card" (click)="navigateTo('/super-admin/tests')">
            <div class="card-icon">🧪</div>
            <div class="card-content">
              <h3>Tests</h3>
              <p>Run and view test results for all test suites</p>
              <div class="card-status active">Available</div>
            </div>
            <div class="card-arrow">→</div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
    }

    .super-admin-dashboard {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      padding: 2rem;
      padding-top: 1rem;
    }

    .dashboard-header {
      margin-bottom: 3rem;
      text-align: center;
    }

    .dashboard-header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      font-size: 1.125rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .dashboard-card:not(.disabled):hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: #00d4ff;
      transform: translateY(-4px);
      box-shadow: 0 8px 32px rgba(0, 212, 255, 0.2);
    }

    .dashboard-card.disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .card-icon {
      font-size: 3rem;
      flex-shrink: 0;
    }

    .card-content {
      flex: 1;
    }

    .card-content h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 0.5rem 0;
    }

    .card-content p {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0 0 0.75rem 0;
      line-height: 1.4;
    }

    .card-status {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.6);
    }

    .card-status.active {
      background: rgba(0, 212, 255, 0.2);
      color: #00d4ff;
    }

    .card-arrow {
      font-size: 1.5rem;
      color: #00d4ff;
      flex-shrink: 0;
      opacity: 0;
      transform: translateX(-10px);
      transition: all 0.3s ease;
    }

    .dashboard-card:not(.disabled):hover .card-arrow {
      opacity: 1;
      transform: translateX(0);
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .super-admin-dashboard {
        padding: 1rem;
      }

      .dashboard-header h1 {
        font-size: 1.75rem;
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .dashboard-card {
        padding: 1.5rem;
      }

      .card-icon {
        font-size: 2.5rem;
      }
    }
  `]
})
export class SuperAdminDashboardComponent implements OnInit, OnDestroy {
  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  pendingDraftsCount = 0;
  private routerSubscription?: Subscription;

  ngOnInit() {
    this.loadPendingDraftsCount();
    
    // Refresh count when navigating back to this page
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        if (event.url === '/super-admin' || event.urlAfterRedirects === '/super-admin') {
          // Small delay to ensure any pending drafts are saved
          setTimeout(() => {
            this.loadPendingDraftsCount();
          }, 300);
        }
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadPendingDraftsCount() {
    this.http.get<any[]>(`${environment.apiUrl}/lesson-drafts/pending`, {
      headers: {
        'x-tenant-id': environment.tenantId
      }
    }).subscribe({
      next: (drafts) => {
        // Only count drafts that have changes (changesCount > 0)
        // This filters out drafts that were just saved but not yet submitted
        // A draft with changesCount > 0 means it has been processed and has actual changes to review
        const submittedDrafts = (drafts || []).filter((d: any) => 
          d.changesCount && d.changesCount > 0
        );
        this.pendingDraftsCount = submittedDrafts.length;
      },
      error: (err) => {
        console.error('Failed to load pending drafts count:', err);
        this.pendingDraftsCount = 0;
      }
    });
  }
}


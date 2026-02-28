import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Subject, takeUntil } from 'rxjs';
import { HubsService, HubDetail } from '../../core/services/hubs.service';
import { HubShelvesComponent } from '../../shared/components/hub-shelves/hub-shelves.component';

@Component({
  selector: 'app-hub-home',
  standalone: true,
  imports: [CommonModule, IonContent, HubShelvesComponent],
  template: `
    <ion-content>
    <div class="min-h-screen bg-brand-black text-white pt-20">
      <div *ngIf="loading" class="text-gray-400 text-center py-20">Loading hub...</div>
      <div *ngIf="error" class="text-center py-20">
        <p class="text-red-400 text-lg mb-4">{{ error }}</p>
        <button (click)="router.navigate(['/home'])" class="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition">Go Home</button>
      </div>

      <!-- SSO Error from callback -->
      <div *ngIf="ssoError" class="text-center py-20">
        <div class="inline-block p-6 bg-red-900/20 border border-red-800 rounded-xl max-w-md mx-auto">
          <svg class="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <p class="text-red-300 mb-3">{{ ssoError }}</p>
          <button (click)="ssoError = ''; loadHub()" class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition text-sm">Try Again</button>
        </div>
      </div>

      <div *ngIf="!loading && !error && !ssoError && hub">
        <!-- Preview mode banner -->
        <div *ngIf="previewMode" class="bg-blue-600 text-white text-center py-2 px-4 flex items-center justify-center gap-3">
          <span class="text-sm font-medium">Preview Mode — This is how your hub homepage looks</span>
          <button (click)="router.navigate(['/hubs', hub.slug, 'manage'])" class="px-3 py-1 bg-white/20 rounded text-xs hover:bg-white/30 transition">
            Back to Management
          </button>
        </div>

        <!-- Invite banner (compact, replaces old banner) -->
        <div *ngIf="hub.myStatus === 'invited'" class="bg-cyan-900/30 border-b border-cyan-800/40 px-4 py-3 flex items-center justify-between">
          <span class="text-sm text-cyan-300">You've been invited to join <strong>{{ hub.name }}</strong></span>
          <button (click)="acceptInvite()" class="px-4 py-1.5 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition text-sm">Accept Invite</button>
        </div>

        <!-- SSO Login Required -->
        <div *ngIf="requiresSsoLogin" class="text-center py-20">
          <div class="inline-block p-8 bg-gray-900/50 border border-gray-800 rounded-2xl max-w-md mx-auto">
            <svg class="w-14 h-14 text-cyan-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
            <h2 class="text-xl font-semibold mb-2">Single Sign-On Required</h2>
            <p class="text-gray-400 text-sm mb-6">This hub uses your organization's login system.</p>
            <a [href]="ssoLoginUrl" class="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-500 transition text-sm">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
              </svg>
              Sign in with SSO
            </a>
          </div>
        </div>

        <!-- Shelf-based content (replaces old banner + grid) -->
        <div *ngIf="!requiresSsoLogin">
          <app-hub-shelves [hubSlug]="slug"></app-hub-shelves>
        </div>
      </div>
    </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #000; }
    :host ::ng-deep ion-content { --background: #000; --color: #fff; }
  `]
})
export class HubHomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  slug = '';
  hub: HubDetail | null = null;
  loading = true;
  error = '';
  previewMode = false;

  // SSO state
  ssoError = '';
  ssoLoginUrl = '';
  requiresSsoLogin = false;
  ssoAuthenticated = false;

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private hubsService: HubsService,
  ) {}

  ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';

    // Check for preview mode
    this.previewMode = this.route.snapshot.queryParams['preview'] === 'true';

    // Check for SSO callback params
    const params = this.route.snapshot.queryParams;
    if (params['ssoError']) {
      this.ssoError = decodeURIComponent(params['ssoError']);
      this.loading = false;
    }
    if (params['ssoToken']) {
      this.handleSsoCallback(params);
      return;
    }

    if (this.slug) this.loadHub();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadHub() {
    this.loading = true;
    this.hubsService.getHub(this.slug).pipe(takeUntil(this.destroy$)).subscribe({
      next: (hub) => {
        this.hub = hub;
        this.hubsService.setActiveHub({
          id: hub.id, name: hub.name, slug: hub.slug,
          description: hub.description, type: hub.type,
          isPublic: hub.isPublic, logoUrl: hub.logoUrl,
          bannerUrl: hub.bannerUrl, status: hub.status,
          myRole: hub.myRole, myStatus: hub.myStatus,
          createdAt: hub.createdAt,
        });

        // Check if hub uses external SSO and user is not a member
        const isOidc = (hub as any).ssoEnabled || (hub as any).authProvider === 'oidc';
        const isMember = hub.myRole && hub.myStatus === 'joined';

        if (isOidc && !isMember && !this.ssoAuthenticated) {
          this.requiresSsoLogin = true;
          const apiUrl = 'http://localhost:3000/api';
          this.ssoLoginUrl = `${apiUrl}/auth/hub/${this.slug}/oidc/login`;
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to access this hub';
      },
    });
  }

  handleSsoCallback(params: any) {
    const token = params['ssoToken'];
    const userId = params['ssoUserId'];
    const email = decodeURIComponent(params['ssoEmail'] || '');
    const name = decodeURIComponent(params['ssoName'] || '');

    sessionStorage.setItem('ssoToken', token);
    sessionStorage.setItem('ssoUserId', userId);
    sessionStorage.setItem('ssoEmail', email);
    sessionStorage.setItem('ssoName', name);
    sessionStorage.setItem('ssoHubSlug', this.slug);

    this.ssoAuthenticated = true;
    this.router.navigate(['/hubs', this.slug], { replaceUrl: true });
    setTimeout(() => this.loadHub(), 200);
  }

  acceptInvite() {
    if (!this.hub) return;
    this.hubsService.acceptInvite(this.hub.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadHub(),
      error: (err) => alert(err?.error?.message || 'Failed to accept invite'),
    });
  }
}

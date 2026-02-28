import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-subscription-upgrade',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content [scrollEvents]="true">
      <div class="min-h-screen bg-brand-black text-white page-with-header">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-4xl">
          <!-- Back Button -->
          <button (click)="goBack()" class="flex items-center text-sm text-gray-400 hover:text-white mb-8 transition-colors">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back
          </button>

          <!-- Hero -->
          <div class="text-center mb-12">
            <div class="text-5xl mb-4">🚀</div>
            <h1 class="text-3xl md:text-4xl font-extrabold mb-4">Unlock Your Learning Potential</h1>
            <p class="text-lg text-gray-400 max-w-2xl mx-auto">
              Choose the plan that works best for you and get access to
              {{ requiredTier === 'enterprise' ? 'all premium' : 'more' }} lessons and features.
            </p>
          </div>

          <!-- Pricing Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <!-- Free Tier -->
            <div class="tier-card" [class.current-tier]="currentTier === 'free'">
              <div *ngIf="currentTier === 'free'" class="current-badge">Current Plan</div>
              <h3 class="text-xl font-bold mb-2">Free</h3>
              <div class="text-3xl font-extrabold mb-1">{{ currencySymbol }}0<span class="text-base font-normal text-gray-400">/mo</span></div>
              <p class="text-sm text-gray-400 mb-6">Get started with the basics</p>
              <ul class="features-list">
                <li>Access to public lessons</li>
                <li>Basic AI teacher chat</li>
                <li>Community support</li>
              </ul>
              <button *ngIf="currentTier !== 'free'" disabled class="tier-btn tier-btn-outline mt-auto">Downgrade</button>
              <div *ngIf="currentTier === 'free'" class="mt-auto text-center text-sm text-gray-500 py-3">Your current plan</div>
            </div>

            <!-- Pro Tier -->
            <div class="tier-card featured" [class.current-tier]="currentTier === 'pro'"
                 [class.target-tier]="requiredTier === 'pro' && currentTier !== 'pro'">
              <div *ngIf="currentTier === 'pro'" class="current-badge">Current Plan</div>
              <div *ngIf="requiredTier === 'pro' && currentTier !== 'pro'" class="recommended-badge">Recommended</div>
              <h3 class="text-xl font-bold mb-2">Pro</h3>
              <div class="text-3xl font-extrabold mb-1">{{ currencySymbol }}{{ prices.pro }}<span class="text-base font-normal text-gray-400">/mo</span></div>
              <p class="text-sm text-gray-400 mb-6">For dedicated learners</p>
              <ul class="features-list">
                <li>Everything in Free</li>
                <li>Pro-tier lessons & courses</li>
                <li>Increased AI credits for richer conversations</li>
                <li>Personalised lesson creation tools</li>
                <li>Priority AI teacher support</li>
                <li>Progress tracking & certificates</li>
              </ul>
              <button *ngIf="currentTier !== 'pro'" (click)="handleUpgrade('pro')" class="tier-btn tier-btn-primary mt-auto">
                Upgrade to Pro
              </button>
              <div *ngIf="currentTier === 'pro'" class="mt-auto text-center text-sm text-gray-500 py-3">Your current plan</div>
            </div>

            <!-- Enterprise Tier -->
            <div class="tier-card" [class.current-tier]="currentTier === 'enterprise'"
                 [class.target-tier]="requiredTier === 'enterprise' && currentTier !== 'enterprise'">
              <div *ngIf="currentTier === 'enterprise'" class="current-badge">Current Plan</div>
              <div *ngIf="requiredTier === 'enterprise' && currentTier !== 'enterprise'" class="recommended-badge">Recommended</div>
              <h3 class="text-xl font-bold mb-2">Enterprise</h3>
              <div class="text-3xl font-extrabold mb-1">{{ currencySymbol }}{{ prices.enterprise }}<span class="text-base font-normal text-gray-400">/mo</span></div>
              <p class="text-sm text-gray-400 mb-6">For organisations & teams — up to 50 users</p>
              <ul class="features-list">
                <li>Everything in Pro</li>
                <li>Up to 50 team members included</li>
                <li>Private Hubs for your organisation</li>
                <li>Enterprise-tier lessons & exclusive content</li>
                <li>Team management & member roles</li>
                <li>Custom branding & SSO integration</li>
                <li>Unlimited AI credits</li>
                <li>Dedicated support & onboarding</li>
              </ul>
              <button *ngIf="currentTier !== 'enterprise'" (click)="handleUpgrade('enterprise')" class="tier-btn tier-btn-primary mt-auto">
                Upgrade to Enterprise
              </button>
              <div *ngIf="currentTier === 'enterprise'" class="mt-auto text-center text-sm text-gray-500 py-3">Your current plan</div>
            </div>
          </div>

          <!-- Stripe placeholder notice -->
          <div class="text-center">
            <div class="inline-block bg-gray-900 border border-gray-700 rounded-xl px-6 py-4 max-w-lg">
              <p class="text-sm text-gray-400">
                <span class="text-yellow-400 font-semibold">Coming soon:</span>
                Payment processing via Stripe will be available shortly.
                Upgrades are currently being configured.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .page-with-header { padding-top: 64px; }
    @media (min-width: 768px) { .page-with-header { padding-top: 80px; } }

    .tier-card {
      background: #111;
      border: 1px solid #333;
      border-radius: 16px;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.3s;
    }
    .tier-card:hover { border-color: #555; transform: translateY(-2px); }
    .tier-card.featured { border-color: #cc0000; }
    .tier-card.target-tier { border-color: #cc0000; box-shadow: 0 0 20px rgba(204,0,0,0.2); }
    .tier-card.current-tier { border-color: #22c55e; }

    .current-badge {
      position: absolute; top: -10px; right: 16px;
      background: #22c55e; color: #000; font-size: 0.7rem; font-weight: 700;
      padding: 2px 10px; border-radius: 10px;
    }
    .recommended-badge {
      position: absolute; top: -10px; right: 16px;
      background: #cc0000; color: #fff; font-size: 0.7rem; font-weight: 700;
      padding: 2px 10px; border-radius: 10px;
    }

    .features-list {
      list-style: none; padding: 0; margin: 0 0 1.5rem;
      display: flex; flex-direction: column; gap: 0.5rem;
    }
    .features-list li {
      font-size: 0.875rem; color: #ccc;
      padding-left: 1.5rem;
      position: relative;
    }
    .features-list li::before {
      content: '✓'; position: absolute; left: 0;
      color: #22c55e; font-weight: 700;
    }

    .tier-btn {
      display: block; width: 100%; padding: 0.75rem;
      border-radius: 8px; font-weight: 700; font-size: 0.9rem;
      text-align: center; cursor: pointer; transition: all 0.2s;
      border: none;
    }
    .tier-btn-primary {
      background: #cc0000; color: #fff;
    }
    .tier-btn-primary:hover { background: #a30000; }
    .tier-btn-outline {
      background: transparent; color: #999;
      border: 1px solid #555; cursor: not-allowed;
    }
  `]
})
export class SubscriptionUpgradeComponent implements OnInit {
  currentTier = 'free';
  requiredTier = 'pro';
  returnUrl = '/home';
  currencySymbol = '€';
  prices = { pro: '9.99', enterprise: '249' };

  private static readonly CURRENCY_MAP: Record<string, { symbol: string; pro: string; enterprise: string }> = {
    EUR: { symbol: '€', pro: '9.99', enterprise: '249' },
    GBP: { symbol: '£', pro: '8.99', enterprise: '219' },
    USD: { symbol: '$', pro: '10.99', enterprise: '279' },
  };

  private static readonly COUNTRY_CURRENCY: Record<string, string> = {
    GB: 'GBP', UK: 'GBP',
    US: 'USD', CA: 'USD', AU: 'USD', NZ: 'USD',
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.currentTier = this.authService.getSubscriptionTier() || 'free';
    const params = this.route.snapshot.queryParams;
    this.requiredTier = params['tier'] || 'pro';
    this.returnUrl = params['returnUrl'] || '/home';
    this.detectCurrencyByIP();
  }

  private async detectCurrencyByIP() {
    try {
      const resp = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
      if (!resp.ok) return;
      const data = await resp.json();
      const countryCode = (data?.country_code || '').toUpperCase();
      const currencyCode = SubscriptionUpgradeComponent.COUNTRY_CURRENCY[countryCode]
        || (data?.currency && Object.keys(SubscriptionUpgradeComponent.CURRENCY_MAP).includes(data.currency) ? data.currency : null);
      if (currencyCode) {
        const cfg = SubscriptionUpgradeComponent.CURRENCY_MAP[currencyCode];
        if (cfg) {
          this.currencySymbol = cfg.symbol;
          this.prices = { pro: cfg.pro, enterprise: cfg.enterprise };
        }
      }
    } catch {
      // IP lookup failed or timed out — keep EUR defaults
    }
  }

  goBack() {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.router.navigate(['/home']);
    }
  }

  handleUpgrade(tier: string) {
    alert(`Stripe integration coming soon! You selected the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan. Payment processing will be available shortly.`);
  }
}

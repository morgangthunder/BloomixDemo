import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { HubsService } from '../../core/services/hubs.service';

type HubTypeOption = 'upora_domain' | 'embedded_blob' | 'dedicated_db';

@Component({
  selector: 'app-hub-create',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
    <div class="min-h-screen bg-brand-black text-white pt-20">
      <div class="container mx-auto px-4 py-8 max-w-4xl">
        <!-- Back -->
        <button (click)="router.navigate(['/home'])" class="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back
        </button>

        <h1 class="text-3xl font-bold mb-2">Create a Hub</h1>
        <p class="text-gray-400 mb-8">Choose how you want to deploy your hub. You can always change settings later.</p>

        <!-- Step 1: Select Type -->
        <div *ngIf="step === 'select'" class="grid grid-cols-1 md:grid-cols-3 gap-6">

          <!-- Option 1: Upora Domain -->
          <div class="type-card" [class.selected]="selectedType === 'upora_domain'" (click)="selectType('upora_domain')">
            <div class="type-icon">
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
              </svg>
            </div>
            <h3 class="type-title">Hub on Upora</h3>
            <p class="type-desc">Host your hub on upora.app. Invite members to access lessons and courses through your branded hub page.</p>
            <ul class="type-features">
              <li>Custom hub URL (/hubs/your-slug)</li>
              <li>Invite-only or public access</li>
              <li>Full Upora feature set</li>
              <li>No setup required</li>
            </ul>
            <span class="type-badge recommended">Recommended</span>
          </div>

          <!-- Option 2: Embeddable -->
          <div class="type-card" [class.selected]="selectedType === 'embedded_blob'" (click)="selectType('embedded_blob')">
            <div class="type-icon">
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
              </svg>
            </div>
            <h3 class="type-title">Embeddable Hub</h3>
            <p class="type-desc">Get a JavaScript snippet to embed your hub on any website. Users authenticate through Upora.</p>
            <ul class="type-features">
              <li>Drop-in JS embed code</li>
              <li>Works on any website</li>
              <li>Upora handles auth & data</li>
              <li>Automatic updates</li>
            </ul>
            <span class="type-badge">Flexible</span>
          </div>

          <!-- Option 3: Dedicated DB (Coming Soon) -->
          <div class="type-card disabled">
            <div class="type-icon">
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
              </svg>
            </div>
            <h3 class="type-title">Dedicated Infrastructure</h3>
            <p class="type-desc">Get a dedicated database with optional VPC peering for maximum data isolation and compliance.</p>
            <ul class="type-features">
              <li>Dedicated AWS RDS instance</li>
              <li>Private VPC peering option</li>
              <li>GDPR/FERPA compliant</li>
              <li>Full data sovereignty</li>
            </ul>
            <span class="type-badge coming-soon">Coming Soon</span>
          </div>
        </div>

        <!-- Step 2: Hub Details Form -->
        <div *ngIf="step === 'details'" class="max-w-lg mx-auto">
          <div class="flex items-center gap-3 mb-6">
            <button (click)="step = 'select'" class="text-gray-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <h2 class="text-xl font-semibold">Hub Details</h2>
            <span class="text-xs px-2 py-0.5 rounded" [class.bg-cyan-900]="selectedType === 'upora_domain'" [class.text-cyan-300]="selectedType === 'upora_domain'" [class.bg-purple-900]="selectedType === 'embedded_blob'" [class.text-purple-300]="selectedType === 'embedded_blob'">
              {{ selectedType === 'upora_domain' ? 'Upora Domain' : 'Embeddable' }}
            </span>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Hub Name *</label>
              <input [(ngModel)]="form.name" (input)="autoSlug()" placeholder="e.g. Biology 101" class="form-input" />
            </div>

            <div>
              <label class="block text-sm text-gray-400 mb-1">URL Slug *</label>
              <div class="flex items-center gap-2">
                <span class="text-gray-500 text-sm">/hubs/</span>
                <input [(ngModel)]="form.slug" placeholder="bio-101" class="form-input flex-1" />
              </div>
              <p class="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only</p>
            </div>

            <div>
              <label class="block text-sm text-gray-400 mb-1">Description</label>
              <textarea [(ngModel)]="form.description" placeholder="What is this hub about?" class="form-input" rows="3"></textarea>
            </div>

            <div class="flex items-center gap-3">
              <input type="checkbox" [(ngModel)]="form.isPublic" id="isPublic" class="accent-cyan-500 w-4 h-4" />
              <label for="isPublic" class="text-sm text-gray-300">Make hub publicly browsable (non-members can see content)</label>
            </div>

            <!-- Embed Code Preview (for embedded_blob type) -->
            <div *ngIf="selectedType === 'embedded_blob' && form.slug" class="embed-preview">
              <label class="block text-sm text-gray-400 mb-1">Embed Code (available after creation)</label>
              <code class="block bg-gray-900 p-3 rounded text-xs text-cyan-300 font-mono">
                &lt;upora-hub tenant="your-tenant" hub="{{ form.slug }}"&gt;&lt;/upora-hub&gt;
              </code>
            </div>

            <div *ngIf="error" class="text-red-400 text-sm bg-red-900/20 p-3 rounded">{{ error }}</div>

            <div class="flex justify-end gap-3 pt-4">
              <button (click)="step = 'select'" class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition">Back</button>
              <button (click)="createHub()" [disabled]="creating || !form.name.trim() || !form.slug.trim()" class="px-6 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {{ creating ? 'Creating...' : 'Create Hub' }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #000; }
    :host ::ng-deep ion-content { --background: #000; --color: #fff; }

    .type-card {
      background: rgba(255,255,255,0.03);
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    .type-card:hover:not(.disabled) {
      border-color: rgba(0,212,255,0.4);
      background: rgba(0,212,255,0.05);
      transform: translateY(-4px);
    }
    .type-card.selected {
      border-color: #00d4ff;
      background: rgba(0,212,255,0.1);
      box-shadow: 0 0 20px rgba(0,212,255,0.15);
    }
    .type-card.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .type-icon {
      width: 56px; height: 56px;
      background: rgba(0,212,255,0.1);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 1rem;
      color: #00d4ff;
    }
    .disabled .type-icon { color: #666; background: rgba(255,255,255,0.05); }

    .type-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .type-desc { font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-bottom: 1rem; line-height: 1.5; }

    .type-features {
      list-style: none; padding: 0; margin: 0 0 1rem;
      font-size: 0.8rem; color: rgba(255,255,255,0.5);
    }
    .type-features li {
      padding: 0.2rem 0 0.2rem 1.2rem;
      position: relative;
    }
    .type-features li::before {
      content: '\\2713';
      position: absolute; left: 0;
      color: #00d4ff;
    }
    .disabled .type-features li::before { color: #666; }

    .type-badge {
      display: inline-block; padding: 0.2rem 0.6rem;
      border-radius: 6px; font-size: 0.7rem; font-weight: 600;
      text-transform: uppercase; margin-top: auto;
      background: rgba(0,212,255,0.15); color: #00d4ff;
      align-self: flex-start;
    }
    .type-badge.recommended { background: rgba(34,197,94,0.15); color: #22c55e; }
    .type-badge.coming-soon { background: rgba(251,191,36,0.15); color: #fbbf24; }

    .form-input {
      width: 100%; padding: 0.7rem 1rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px; color: #fff; font-size: 0.9rem;
    }
    .form-input::placeholder { color: rgba(255,255,255,0.3); }
    .form-input:focus { outline: none; border-color: rgba(0,212,255,0.5); }

    .embed-preview {
      padding: 1rem; background: rgba(0,212,255,0.05);
      border: 1px solid rgba(0,212,255,0.15); border-radius: 8px;
    }
  `]
})
export class HubCreateComponent {
  step: 'select' | 'details' = 'select';
  selectedType: HubTypeOption = 'upora_domain';

  form = {
    name: '',
    slug: '',
    description: '',
    isPublic: false,
  };

  creating = false;
  error = '';

  constructor(
    public router: Router,
    private hubsService: HubsService,
  ) {}

  selectType(type: HubTypeOption) {
    if (type === 'dedicated_db') return; // Coming soon
    this.selectedType = type;
    this.step = 'details';
  }

  autoSlug() {
    // Auto-generate slug from name
    this.form.slug = this.form.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  createHub() {
    if (!this.form.name.trim() || !this.form.slug.trim()) return;
    this.creating = true;
    this.error = '';

    this.hubsService.createHub({
      name: this.form.name.trim(),
      slug: this.form.slug.trim(),
      description: this.form.description.trim() || undefined,
      type: this.selectedType,
      isPublic: this.form.isPublic,
    }).subscribe({
      next: (hub: any) => {
        this.creating = false;
        this.hubsService.refreshMyHubs();
        this.router.navigate(['/hubs', hub.slug, 'manage']);
      },
      error: (err) => {
        this.creating = false;
        this.error = err?.error?.message || err?.message || 'Failed to create hub';
      },
    });
  }
}

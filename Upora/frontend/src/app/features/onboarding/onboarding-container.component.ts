import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { OnboardingWelcomeStepComponent } from './onboarding-welcome-step.component';
import { OnboardingProfileStepComponent } from './onboarding-profile-step.component';
import { OnboardingInterestsStepComponent } from './onboarding-interests-step.component';
import { OnboardingLearningStepComponent } from './onboarding-learning-step.component';
import { OnboardingDoneStepComponent } from './onboarding-done-step.component';
import { AuthService } from '../../core/services/auth.service';
import { OnboardingService, UserPersonalization } from '../../core/services/onboarding.service';
import { ONBOARDING_STEPS } from '../../core/config/onboarding.config';

@Component({
  selector: 'app-onboarding-container',
  standalone: true,
  imports: [
    CommonModule,
    OnboardingWelcomeStepComponent,
    OnboardingProfileStepComponent,
    OnboardingInterestsStepComponent,
    OnboardingLearningStepComponent,
    OnboardingDoneStepComponent,
  ],
  template: `
    <div class="min-h-screen bg-brand-black flex items-center justify-center p-4">
      <div class="w-full max-w-lg bg-brand-dark rounded-xl p-8 shadow-xl border border-gray-800">
        <!-- Progress dots -->
        <div class="flex justify-center gap-2 mb-8">
          <span
            *ngFor="let step of steps; let i = index"
            class="w-2 h-2 rounded-full transition"
            [class.bg-brand-red]="i <= currentIndex"
            [class.bg-gray-600]="i > currentIndex"
          ></span>
        </div>

        <!-- Step content (scrollable for interests steps with many options) -->
        <div class="step-content" [class.step-content-scrollable]="currentStepId === 'tv_movies' || currentStepId === 'hobbies'">
        <div *ngIf="checkingAuth()" class="checking-auth">Loading preferences...</div>
        <ng-container *ngIf="!checkingAuth()" [ngSwitch]="currentStepId">
          <app-onboarding-welcome-step *ngSwitchCase="'welcome'" />
          <app-onboarding-profile-step
            *ngSwitchCase="'profile'"
            [fullName]="formData.fullName ?? ''"
            [ageRange]="formData.ageRange ?? ''"
            [gender]="formData.gender ?? ''"
            (dataChange)="onProfileChange($event)"
          />
          <app-onboarding-interests-step
            *ngSwitchCase="'tv_movies'"
            category="tv_movies"
            [selectedTv]="formData.favouriteTvMovies ?? []"
            [selectedHobbies]="formData.hobbiesInterests ?? []"
            [ageRange]="formData.ageRange ?? ''"
            [gender]="formData.gender ?? ''"
            (dataChange)="onInterestsChange($event)"
          />
          <app-onboarding-interests-step
            *ngSwitchCase="'hobbies'"
            category="hobbies"
            [selectedTv]="formData.favouriteTvMovies ?? []"
            [selectedHobbies]="formData.hobbiesInterests ?? []"
            [ageRange]="formData.ageRange ?? ''"
            [gender]="formData.gender ?? ''"
            (dataChange)="onInterestsChange($event)"
          />
          <app-onboarding-learning-step
            *ngSwitchCase="'learning'"
            [selected]="formData.learningAreas ?? []"
            [ageRange]="formData.ageRange ?? ''"
            [gender]="formData.gender ?? ''"
            (dataChange)="onLearningChange($event)"
          />
          <app-onboarding-done-step *ngSwitchCase="'done'" [isEditing]="isReturningUser" />
        </ng-container>
        </div>

        <!-- Actions (hidden on welcome and while checking - user uses Sign in / Create account) -->
        <div *ngIf="!checkingAuth() && currentStepId !== 'welcome'" class="mt-8 flex gap-3">
          <button
            *ngIf="canGoBack"
            type="button"
            (click)="previous()"
            class="flex-1 py-3 px-4 rounded text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 transition"
          >
            Previous
          </button>
          <button
            *ngIf="canSkip && !canGoBack"
            type="button"
            (click)="skip()"
            class="flex-1 py-3 px-4 rounded text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 transition"
          >
            Skip
          </button>
          <button
            type="button"
            (click)="next()"
            [disabled]="loading()"
            class="flex-1 bg-brand-red text-white font-bold py-3 px-4 rounded hover:bg-opacity-90 transition disabled:opacity-50"
          >
            {{ primaryButtonLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .step-content {
      flex: 0 1 auto;
    }
    .step-content-scrollable {
      max-height: 50vh;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      padding-right: 4px;
    }
    .step-content-scrollable::-webkit-scrollbar {
      width: 6px;
    }
    .step-content-scrollable::-webkit-scrollbar-track {
      background: rgba(255,255,255,0.05);
      border-radius: 3px;
    }
    .step-content-scrollable::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.2);
      border-radius: 3px;
    }
    .checking-auth {
      color: rgba(255,255,255,0.6);
      text-align: center;
      padding: 2rem;
      font-size: 0.95rem;
    }
  `],
})
export class OnboardingContainerComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private onboarding = inject(OnboardingService);
  private cdr = inject(ChangeDetectorRef);

  steps = ONBOARDING_STEPS;
  currentIndex = 0;
  loading = signal(false);
  /** True while checking if authenticated user has completed onboarding (prevents Sign In flash). Start true when authenticated so first paint never shows welcome. */
  checkingAuth = signal(inject(AuthService).isAuthenticated());
  /** True when user has already completed onboarding (editing preferences). Starts at first content step, shows Save instead of Continue. */
  isReturningUser = false;
  formData: Partial<UserPersonalization> = {
    fullName: '',
    ageRange: '',
    gender: '',
    favouriteTvMovies: [],
    hobbiesInterests: [],
    learningAreas: [],
  };

  get currentStepId() {
    return this.steps[this.currentIndex]?.id ?? 'welcome';
  }
  get isLastStep() {
    return this.currentIndex >= this.steps.length - 1;
  }
  get canSkip() {
    return (
      !!this.steps[this.currentIndex]?.skipLabel &&
      this.currentStepId !== 'welcome' &&
      this.currentStepId !== 'done'
    );
  }
  get canGoBack() {
    return this.currentIndex > 1;
  }
  primaryButtonLabel(): string {
    if (this.loading()) return 'Saving...';
    if (this.isLastStep) return this.isReturningUser ? 'Save' : 'Continue';
    return 'Next';
  }

  ngOnInit() {
    const returnUrl =
      this.route.snapshot.queryParams['returnUrl'] ||
      this.onboarding.getReturnUrl() ||
      '/home';
    this.onboarding.setReturnUrl(returnUrl);

    if (this.auth.isAuthenticated()) {
      this.checkingAuth.set(true);
      this.onboarding.getMine().subscribe({
        next: (prefs) => {
          this.checkingAuth.set(false);
          this.formData = { ...this.formData, ...prefs };
          this.isReturningUser = this.onboarding.hasCompletedOnboarding(prefs);
          // Returning users: start at first content step (profile). New users: same.
          this.currentIndex = 1;
          this.cdr.detectChanges();
        },
        error: () => {
          this.checkingAuth.set(false);
          this.currentIndex = 1;
          this.cdr.detectChanges();
        },
      });
    }
  }

  onProfileChange(e: { fullName: string; ageRange: string; gender: string }) {
    this.formData = { ...this.formData, ...e };
  }

  onInterestsChange(e: {
    favouriteTvMovies: string[];
    hobbiesInterests: string[];
  }) {
    this.formData = { ...this.formData, ...e };
  }

  onLearningChange(e: { learningAreas: string[] }) {
    this.formData = { ...this.formData, ...e };
  }

  async next() {
    if (this.currentStepId === 'welcome') {
      const returnUrl = this.onboarding.getReturnUrl() || '/home';
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/onboarding' } });
      return;
    }

    if (this.isLastStep) {
      await this.saveAndFinish();
      return;
    }

    this.currentIndex++;
    this.cdr.detectChanges();
  }

  previous() {
    if (this.currentIndex > 1) {
      this.currentIndex--;
      this.cdr.detectChanges();
    }
  }

  async skip() {
    this.loading.set(true);
    try {
      await firstValueFrom(this.onboarding.skipOnboarding());
      this.finish(this.onboarding.getReturnUrl() || '/home');
    } catch {
      this.finish(this.onboarding.getReturnUrl() || '/home');
    } finally {
      this.loading.set(false);
    }
  }

  private async saveAndFinish() {
    this.loading.set(true);
    try {
      await firstValueFrom(
        this.onboarding.updateMine({
          fullName: this.formData.fullName,
          ageRange: this.formData.ageRange,
          gender: this.formData.gender,
          favouriteTvMovies: this.formData.favouriteTvMovies ?? [],
          hobbiesInterests: this.formData.hobbiesInterests ?? [],
          learningAreas: this.formData.learningAreas ?? [],
        })
      );
      await firstValueFrom(this.onboarding.completeOnboarding());
      this.finish(this.onboarding.getReturnUrl() || '/home');
    } catch {
      this.finish(this.onboarding.getReturnUrl() || '/home');
    } finally {
      this.loading.set(false);
    }
  }

  private finish(returnUrl: string) {
    this.onboarding.clearReturnUrl();
    this.router.navigateByUrl(returnUrl);
  }
}

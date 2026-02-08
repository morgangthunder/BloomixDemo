import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-onboarding-welcome-step',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="text-center">
      <h2 class="text-2xl font-bold text-white mb-2">Welcome to Upora</h2>
      <p class="text-gray-400 mb-8">Sign in to personalise your experience and track your progress</p>
      <div class="flex flex-col gap-3">
        <a
          routerLink="/login"
          [queryParams]="{ returnUrl: '/onboarding' }"
          class="w-full bg-brand-red text-white font-bold py-3 px-4 rounded hover:bg-opacity-90 transition text-center"
        >
          Sign in
        </a>
        <a
          routerLink="/signup"
          [queryParams]="{ returnUrl: '/onboarding' }"
          class="w-full bg-gray-700 text-white font-medium py-3 px-4 rounded hover:bg-gray-600 transition text-center"
        >
          Create account
        </a>
      </div>
      <p class="mt-6 text-gray-500 text-sm">
        <a routerLink="/home" class="hover:text-gray-400">Browse without signing in</a>
      </p>
    </div>
  `,
})
export class OnboardingWelcomeStepComponent {}

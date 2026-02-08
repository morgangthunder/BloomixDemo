import { Component } from '@angular/core';

@Component({
  selector: 'app-onboarding-done-step',
  standalone: true,
  template: `
    <div class="text-center">
      <h2 class="text-2xl font-bold text-white mb-2">You're all set!</h2>
      <p class="text-gray-400 mb-8">Your Upora experience is ready. Continue to explore.</p>
      <p class="text-sm text-gray-500">Click Continue below to finish</p>
    </div>
  `,
})
export class OnboardingDoneStepComponent {}

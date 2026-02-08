import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-onboarding-done-step',
  standalone: true,
  template: `
    <div class="text-center">
      @if (isEditing) {
        <h2 class="text-2xl font-bold text-white mb-2">Review your preferences</h2>
        <p class="text-gray-400 mb-8">Click Save below to update and finish.</p>
      } @else {
        <h2 class="text-2xl font-bold text-white mb-2">You're all set!</h2>
        <p class="text-gray-400 mb-8">Your Upora experience is ready. Continue to explore.</p>
        <p class="text-sm text-gray-500">Click Continue below to finish</p>
      }
    </div>
  `,
})
export class OnboardingDoneStepComponent {
  @Input() isEditing = false;
}

/**
 * Onboarding step configuration.
 * Easy to reorder, add, or remove steps.
 */
export interface OnboardingStepConfig {
  id: string;
  required: boolean;
  skipLabel?: string;
}

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  { id: 'welcome', required: true },
  { id: 'profile', required: false, skipLabel: 'Skip' },
  { id: 'tv_movies', required: false, skipLabel: 'Skip' },
  { id: 'hobbies', required: false, skipLabel: 'Skip' },
  { id: 'learning', required: false, skipLabel: 'Skip' },
  { id: 'done', required: true },
];

export const ONBOARDING_RETURN_URL_KEY = 'onboarding_return_url';

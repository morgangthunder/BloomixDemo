import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ONBOARDING_RETURN_URL_KEY } from '../config/onboarding.config';

export interface UserPersonalization {
  userId: string;
  fullName?: string;
  ageRange?: string;
  gender?: string;
  favouriteTvMovies: string[];
  hobbiesInterests: string[];
  learningAreas: string[];
  onboardingCompletedAt?: string;
  skippedOnboarding: boolean;
}

export interface PersonalizationOption {
  id: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  constructor(private api: ApiService) {}

  getMine(): Observable<UserPersonalization> {
    return this.api.get<UserPersonalization>('/user-personalization/me').pipe(
      catchError(() =>
        of({
          userId: '',
          favouriteTvMovies: [],
          hobbiesInterests: [],
          learningAreas: [],
          skippedOnboarding: false,
        } as UserPersonalization)
      )
    );
  }

  updateMine(data: Partial<UserPersonalization>): Observable<UserPersonalization> {
    return this.api.patch<UserPersonalization>('/user-personalization/me', data);
  }

  completeOnboarding(): Observable<UserPersonalization> {
    return this.api.patch<UserPersonalization>(
      '/user-personalization/me/complete-onboarding',
      {}
    );
  }

  skipOnboarding(): Observable<UserPersonalization> {
    return this.api.patch<UserPersonalization>(
      '/user-personalization/me/skip-onboarding',
      {}
    );
  }

  getOptions(category: string): Observable<PersonalizationOption[]> {
    return this.api.get<PersonalizationOption[]>(
      `/user-personalization/options/${category}`
    );
  }

  getAllOptions(): Observable<
    Record<string, PersonalizationOption[]>
  > {
    return this.api.get<Record<string, PersonalizationOption[]>>(
      '/user-personalization/options'
    );
  }

  /** Check if user has completed onboarding (or skipped). */
  hasCompletedOnboarding(prefs: UserPersonalization | null): boolean {
    if (!prefs) return false;
    return !!prefs.onboardingCompletedAt || prefs.skippedOnboarding;
  }

  getReturnUrl(): string | null {
    return sessionStorage.getItem(ONBOARDING_RETURN_URL_KEY);
  }

  setReturnUrl(url: string): void {
    sessionStorage.setItem(ONBOARDING_RETURN_URL_KEY, url);
  }

  clearReturnUrl(): void {
    sessionStorage.removeItem(ONBOARDING_RETURN_URL_KEY);
  }
}

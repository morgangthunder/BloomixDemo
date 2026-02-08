import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingService, PersonalizationOption } from '../../core/services/onboarding.service';

/**
 * Single-category interests step. Use category='tv_movies' or 'hobbies'.
 * Each onboarding flow shows one category per step.
 */
@Component({
  selector: 'app-onboarding-interests-step',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h2 class="text-xl font-bold text-white mb-4">{{ title }}</h2>
      <p class="text-gray-400 text-sm mb-6">Select what you enjoy (optional).</p>

      <div class="flex flex-wrap gap-2">
        <button
          *ngFor="let opt of options"
          type="button"
          (click)="toggle(opt.id)"
          [class.bg-brand-red]="selectedIds.includes(opt.id)"
          [class.bg-gray-700]="!selectedIds.includes(opt.id)"
          class="px-3 py-1.5 rounded-full text-sm text-white hover:opacity-90 transition"
        >
          {{ opt.label }}
        </button>
      </div>
      <p *ngIf="options.length === 0" class="text-gray-500 text-sm mt-4">No options available. You can skip this step.</p>
    </div>
  `,
})
export class OnboardingInterestsStepComponent implements OnInit {
  /** Which category: 'tv_movies' or 'hobbies' */
  @Input() category: 'tv_movies' | 'hobbies' = 'tv_movies';
  @Input() selectedTv: string[] = [];
  @Input() selectedHobbies: string[] = [];
  @Input() ageRange = '';
  @Input() gender = '';
  @Output() dataChange = new EventEmitter<{ favouriteTvMovies: string[]; hobbiesInterests: string[] }>();

  options: PersonalizationOption[] = [];

  get selectedIds(): string[] {
    return this.category === 'tv_movies' ? this.selectedTv : this.selectedHobbies;
  }

  get title(): string {
    return this.category === 'tv_movies' ? 'Favourite TV & movies' : 'Hobbies & interests';
  }

  constructor(private onboarding: OnboardingService) {}

  ngOnInit() {
    this.onboarding
      .getOptions(this.category, this.ageRange || undefined, this.gender || undefined)
      .subscribe((opts) => (this.options = opts));
  }

  toggle(id: string) {
    const current = this.selectedIds;
    const idx = current.indexOf(id);
    const next = idx >= 0 ? current.filter((x) => x !== id) : [...current, id];
    if (this.category === 'tv_movies') {
      this.dataChange.emit({ favouriteTvMovies: next, hobbiesInterests: this.selectedHobbies });
    } else {
      this.dataChange.emit({ favouriteTvMovies: this.selectedTv, hobbiesInterests: next });
    }
  }
}

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingService, PersonalizationOption } from '../../core/services/onboarding.service';

@Component({
  selector: 'app-onboarding-interests-step',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h2 class="text-xl font-bold text-white mb-2">Favourite TV & movies</h2>
      <p class="text-gray-400 text-sm mb-4">Select what you enjoy (optional)</p>
      <div class="flex flex-wrap gap-2 mb-8">
        <button
          *ngFor="let opt of tvOptions"
          type="button"
          (click)="toggle('tv', opt.id)"
          [class.bg-brand-red]="selectedTv.includes(opt.id)"
          [class.bg-gray-700]="!selectedTv.includes(opt.id)"
          class="px-3 py-1.5 rounded-full text-sm text-white hover:opacity-90 transition"
        >
          {{ opt.label }}
        </button>
      </div>
      <h2 class="text-xl font-bold text-white mb-2">Hobbies & interests</h2>
      <p class="text-gray-400 text-sm mb-4">Select what you like (optional)</p>
      <div class="flex flex-wrap gap-2">
        <button
          *ngFor="let opt of hobbyOptions"
          type="button"
          (click)="toggle('hobby', opt.id)"
          [class.bg-brand-red]="selectedHobbies.includes(opt.id)"
          [class.bg-gray-700]="!selectedHobbies.includes(opt.id)"
          class="px-3 py-1.5 rounded-full text-sm text-white hover:opacity-90 transition"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  `,
})
export class OnboardingInterestsStepComponent implements OnInit {
  @Input() selectedTv: string[] = [];
  @Input() selectedHobbies: string[] = [];
  @Output() dataChange = new EventEmitter<{
    favouriteTvMovies: string[];
    hobbiesInterests: string[];
  }>();

  tvOptions: PersonalizationOption[] = [];
  hobbyOptions: PersonalizationOption[] = [];

  constructor(private onboarding: OnboardingService) {}

  ngOnInit() {
    this.onboarding.getOptions('tv_movies').subscribe((opts) => (this.tvOptions = opts));
    this.onboarding.getOptions('hobbies').subscribe((opts) => (this.hobbyOptions = opts));
  }

  toggle(type: 'tv' | 'hobby', id: string) {
    if (type === 'tv') {
      const idx = this.selectedTv.indexOf(id);
      const next = idx >= 0
        ? this.selectedTv.filter((x) => x !== id)
        : [...this.selectedTv, id];
      this.selectedTv = next;
    } else {
      const idx = this.selectedHobbies.indexOf(id);
      const next = idx >= 0
        ? this.selectedHobbies.filter((x) => x !== id)
        : [...this.selectedHobbies, id];
      this.selectedHobbies = next;
    }
    this.dataChange.emit({
      favouriteTvMovies: this.selectedTv,
      hobbiesInterests: this.selectedHobbies,
    });
  }
}

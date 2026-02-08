import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingService, PersonalizationOption } from '../../core/services/onboarding.service';

@Component({
  selector: 'app-onboarding-learning-step',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h2 class="text-xl font-bold text-white mb-2">Learning areas</h2>
      <p class="text-gray-400 text-sm mb-4">What would you like to learn? (optional)</p>
      <div class="flex flex-wrap gap-2">
        <button
          *ngFor="let opt of options"
          type="button"
          (click)="toggle(opt.id)"
          [class.bg-brand-red]="selected.includes(opt.id)"
          [class.bg-gray-700]="!selected.includes(opt.id)"
          class="px-3 py-1.5 rounded-full text-sm text-white hover:opacity-90 transition"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  `,
})
export class OnboardingLearningStepComponent implements OnInit {
  @Input() selected: string[] = [];
  @Output() dataChange = new EventEmitter<{ learningAreas: string[] }>();

  options: PersonalizationOption[] = [];

  constructor(private onboarding: OnboardingService) {}

  ngOnInit() {
    this.onboarding.getOptions('learning_areas').subscribe((opts) => (this.options = opts));
  }

  toggle(id: string) {
    const idx = this.selected.indexOf(id);
    const next =
      idx >= 0 ? this.selected.filter((x) => x !== id) : [...this.selected, id];
    this.selected = next;
    this.dataChange.emit({ learningAreas: this.selected });
  }
}

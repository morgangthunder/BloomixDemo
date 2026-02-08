import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-onboarding-profile-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 class="text-xl font-bold text-white mb-2">About you</h2>
      <p class="text-gray-400 text-sm mb-6">Optional – helps us personalise content</p>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Full name</label>
          <input
            type="text"
            [(ngModel)]="fullName"
            (ngModelChange)="emitChange()"
            class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
            placeholder="Your name"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Age range</label>
          <select
            [(ngModel)]="ageRange"
            (ngModelChange)="emitChange()"
            class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
          >
            <option value="">Prefer not to say</option>
            <option value="under-18">Under 18</option>
            <option value="18-24">18–24</option>
            <option value="25-34">25–34</option>
            <option value="35-44">35–44</option>
            <option value="45-54">45–54</option>
            <option value="55+">55+</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Gender</label>
          <select
            [(ngModel)]="gender"
            (ngModelChange)="emitChange()"
            class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non_binary">Non-binary</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  `,
})
export class OnboardingProfileStepComponent {
  @Input() fullName = '';
  @Input() ageRange = '';
  @Input() gender = '';
  @Output() dataChange = new EventEmitter<{ fullName: string; ageRange: string; gender: string }>();

  emitChange() {
    this.dataChange.emit({
      fullName: this.fullName,
      ageRange: this.ageRange,
      gender: this.gender,
    });
  }
}

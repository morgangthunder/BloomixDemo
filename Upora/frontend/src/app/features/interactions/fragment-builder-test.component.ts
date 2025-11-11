import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { FragmentBuilderComponent } from './fragment-builder/fragment-builder.component';

@Component({
  selector: 'app-fragment-builder-test',
  standalone: true,
  imports: [CommonModule, IonContent, FragmentBuilderComponent],
  template: `
    <ion-content [style.--padding-top]="'80px'">
      <div class="test-page">
        <h1>Fragment Builder Test</h1>
        <p>Testing the AI-generated Fragment Builder interaction</p>

        <app-fragment-builder
          [data]="testData"
          (completed)="onCompleted($event)"
        ></app-fragment-builder>

        <div *ngIf="result" class="result">
          <h3>Result:</h3>
          <p>Score: {{ result.score }}%</p>
          <p>Selected: {{ result.selectedFragments.join(', ') }}</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .test-page {
      padding: 2rem;
      min-height: 100vh;
      background: #0f0f23;
      color: white;
    }

    h1 {
      color: #00d4ff;
      margin-bottom: 0.5rem;
    }

    p {
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 2rem;
    }

    .result {
      margin-top: 2rem;
      padding: 1.5rem;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid #00d4ff;
      border-radius: 12px;
    }

    .result h3 {
      margin-top: 0;
      color: #00d4ff;
    }
  `]
})
export class FragmentBuilderTestComponent {
  // Real data from our successful Grok API test!
  testData = {
    targetStatement: "Plants use chlorophyll to convert light energy into chemical energy, producing glucose and oxygen from 6CO2 and 6H2O.",
    fragments: [
      { text: "Plants perform photosynthesis", isTrueInContext: true, explanation: "Plants are the primary organisms that carry out photosynthesis." },
      { text: "Chlorophyll captures sunlight", isTrueInContext: true, explanation: "Chlorophyll in plants' chloroplasts is used to absorb sunlight." },
      { text: "The process produces glucose and oxygen", isTrueInContext: true, explanation: "The photosynthesis equation produces glucose and oxygen as outputs." },
      { text: "Plants eat soil", isTrueInContext: false, explanation: "Plants do not eat soil; they make their own food through photosynthesis." },
      { text: "Photosynthesis occurs without light", isTrueInContext: false, explanation: "Without sunlight, photosynthesis cannot occur." },
      { text: "Chlorophyll is a green pigment", isTrueInContext: true, explanation: "Chlorophyll is the green pigment that absorbs light." },
      { text: "The equation involves 6CO2 and 6H2O", isTrueInContext: true, explanation: "The equation is 6CO2 + 6H2O + light." },
      { text: "Plants convert light to chemical energy", isTrueInContext: true, explanation: "Photosynthesis converts light energy into chemical energy." }
    ],
    maxFragments: 8
  };

  result: any = null;

  onCompleted(event: { score: number; selectedFragments: string[] }) {
    this.result = event;
    console.log('[Test] Fragment Builder completed:', event);
  }
}


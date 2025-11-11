import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Fragment {
  text: string;
  isTrueInContext: boolean;
  explanation: string;
}

interface TrueFalseSelectionData {
  fragments: Fragment[];
  targetStatement: string;
  maxFragments: number;
}

@Component({
  selector: 'app-true-false-selection',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="true-false-container">
      <!-- Target Statement -->
      <div class="target-statement">
        <div class="label">Select all the TRUE statements:</div>
        <div class="statement">{{ data?.targetStatement || 'Loading...' }}</div>
      </div>

      <!-- Fragments Grid -->
      <div class="fragments-grid">
        <div 
          *ngFor="let fragment of data?.fragments; let i = index"
          class="fragment-tile"
          [class.selected]="isSelected(i)"
          [class.correct]="showScore && fragment.isTrueInContext && isSelected(i)"
          [class.incorrect]="showScore && !fragment.isTrueInContext && isSelected(i)"
          [class.missed]="showScore && fragment.isTrueInContext && !isSelected(i)"
          [class.locked]="showScore"
          (click)="toggleFragment(i)"
          [title]="fragment.explanation"
        >
          <div class="fragment-text">{{ fragment.text }}</div>
          <div *ngIf="showScore" class="fragment-feedback">
            <span *ngIf="fragment.isTrueInContext && isSelected(i)" class="feedback-icon">✓</span>
            <span *ngIf="!fragment.isTrueInContext && isSelected(i)" class="feedback-icon">✗</span>
            <span *ngIf="fragment.isTrueInContext && !isSelected(i)" class="feedback-icon">○</span>
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="instructions" *ngIf="!showScore">
        <p>💡 Tap statements to select them • Hover for explanations</p>
      </div>

      <!-- Score Display -->
      <div *ngIf="showScore" class="score-display" [class.perfect]="score === 100">
        <div class="score-label">Your Score:</div>
        <div class="score-value">{{ score }}%</div>
        <div class="score-breakdown">
          {{ getCorrectCount() }} out of {{ getTrueCount() }} correct
        </div>
        <div *ngIf="score === 100" class="perfect-message">🎉 Perfect Score!</div>
        <div *ngIf="score < 100" class="try-again">Review the highlighted statements</div>
      </div>

      <!-- Action Buttons -->
      <div class="actions">
        <button 
          *ngIf="!showScore" 
          class="submit-btn" 
          (click)="checkAnswers()"
          [disabled]="selectedFragments.size === 0"
        >
          Check My Answer
        </button>

        <button 
          *ngIf="showScore" 
          class="continue-btn" 
          (click)="complete()"
        >
          Continue →
        </button>
      </div>
    </div>
  `,
  styles: [`
    .true-false-container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      padding: 2rem;
      gap: 2rem;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      color: #ffffff;
      min-height: 100%;
    }

    .target-statement {
      text-align: center;
      padding: 2rem;
      background: rgba(0, 212, 255, 0.1);
      border: 2px solid rgba(0, 212, 255, 0.3);
      border-radius: 16px;
    }

    .label {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .statement {
      font-size: 1.125rem;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.8;
    }

    .fragments-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin: 0 auto;
      width: 100%;
    }

    .fragment-tile {
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 1.5rem;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      user-select: none;
    }

    .fragment-tile:hover:not(.locked) {
      background: rgba(255, 255, 255, 0.08);
      border-color: #00d4ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.2);
    }

    .fragment-tile.selected:not(.locked) {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
      border-width: 3px;
    }

    .fragment-tile.correct {
      background: rgba(76, 175, 80, 0.2);
      border-color: #4caf50;
      border-width: 3px;
    }

    .fragment-tile.incorrect {
      background: rgba(244, 67, 54, 0.2);
      border-color: #f44336;
      border-width: 3px;
    }

    .fragment-tile.missed {
      background: rgba(255, 193, 7, 0.15);
      border-color: #ffc107;
      border-width: 2px;
    }

    .fragment-tile.locked {
      cursor: default;
    }

    .fragment-text {
      font-size: 1rem;
      font-weight: 500;
      color: #ffffff;
      text-align: center;
      line-height: 1.4;
    }

    .fragment-feedback {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
    }

    .feedback-icon {
      font-size: 1.5rem;
      font-weight: bold;
    }

    .fragment-tile.correct .feedback-icon {
      color: #4caf50;
    }

    .fragment-tile.incorrect .feedback-icon {
      color: #f44336;
    }

    .fragment-tile.missed .feedback-icon {
      color: #ffc107;
    }

    .instructions {
      text-align: center;
    }

    .instructions p {
      margin: 0;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
    }

    .score-display {
      text-align: center;
      padding: 2rem;
      background: rgba(0, 212, 255, 0.1);
      border-radius: 16px;
      border: 2px solid rgba(0, 212, 255, 0.3);
    }

    .score-display.perfect {
      background: rgba(76, 175, 80, 0.2);
      border-color: #4caf50;
    }

    .score-label {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }

    .score-value {
      font-size: 4rem;
      font-weight: 700;
      color: #00d4ff;
      margin: 0.5rem 0;
    }

    .score-display.perfect .score-value {
      color: #4caf50;
    }

    .score-breakdown {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 1rem;
    }

    .perfect-message {
      font-size: 1.5rem;
      color: #4caf50;
      margin-top: 1rem;
      font-weight: 600;
    }

    .try-again {
      font-size: 1rem;
      color: #ffc107;
      margin-top: 0.5rem;
    }

    .actions {
      display: flex;
      justify-content: center;
      margin-top: auto;
    }

    .submit-btn, .continue-btn {
      padding: 1rem 3rem;
      border: none;
      border-radius: 12px;
      font-size: 1.125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .submit-btn {
      background: #00d4ff;
      color: #0f0f23;
    }

    .submit-btn:hover:not(:disabled) {
      background: #00bce6;
      box-shadow: 0 6px 20px rgba(0, 212, 255, 0.4);
      transform: translateY(-2px);
    }

    .submit-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .continue-btn {
      background: #4caf50;
      color: white;
    }

    .continue-btn:hover {
      background: #45a049;
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
      transform: translateY(-2px);
    }

    @media (max-width: 1024px) {
      .fragments-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .true-false-container {
        padding: 1rem;
        gap: 1.5rem;
      }

      .target-statement {
        padding: 1.5rem;
      }

      .statement {
        font-size: 1rem;
      }

      .fragments-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .fragment-tile {
        padding: 1.25rem;
        min-height: 100px;
      }

      .score-value {
        font-size: 3rem;
      }
    }
  `]
})
export class TrueFalseSelectionComponent {
  @Input() data: TrueFalseSelectionData | null = null;
  @Output() completed = new EventEmitter<{ score: number; selectedFragments: string[] }>();

  selectedFragments: Set<number> = new Set();
  showScore = false;
  score = 0;

  isSelected(index: number): boolean {
    return this.selectedFragments.has(index);
  }

  toggleFragment(index: number) {
    if (this.showScore) return;

    if (this.selectedFragments.has(index)) {
      this.selectedFragments.delete(index);
    } else {
      this.selectedFragments.add(index);
    }

    console.log('[TrueFalseSelection] Fragment', index, this.isSelected(index) ? 'selected' : 'deselected');
  }

  getTrueCount(): number {
    if (!this.data) return 0;
    return this.data.fragments.filter(f => f.isTrueInContext).length;
  }

  getCorrectCount(): number {
    if (!this.data) return 0;
    return Array.from(this.selectedFragments)
      .filter(index => this.data!.fragments[index].isTrueInContext).length;
  }

  checkAnswers() {
    if (!this.data) return;

    const trueCount = this.getTrueCount();
    const correctSelections = this.getCorrectCount(); // Correctly selected TRUE statements
    
    // Count incorrect selections (selected FALSE statements)
    const incorrectSelections = Array.from(this.selectedFragments)
      .filter(index => !this.data!.fragments[index].isTrueInContext).length;

    // Score = (Correct - Incorrect) / Total TRUE statements
    // Minimum score is 0
    const netCorrect = Math.max(0, correctSelections - incorrectSelections);
    this.score = trueCount > 0 ? Math.round((netCorrect / trueCount) * 100) : 0;
    this.showScore = true;

    console.log('[TrueFalseSelection] Score:', this.score, '% -', correctSelections, 'correct,', incorrectSelections, 'incorrect out of', trueCount, 'true statements');
  }

  complete() {
    const selectedTexts = Array.from(this.selectedFragments).map(i => this.data!.fragments[i].text);
    
    this.completed.emit({
      score: this.score,
      selectedFragments: selectedTexts
    });
  }
}

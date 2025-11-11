import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

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

      <!-- Score Popup Modal -->
      <div *ngIf="showScore" class="score-modal-overlay" (click)="closeScoreModal($event)">
        <div class="score-modal" (click)="$event.stopPropagation()">
          <div class="score-header">
            <h2>{{ score === 100 ? '🎉 Perfect Score!' : score >= 75 ? '✅ Great Job!' : score >= 50 ? '👍 Good Effort!' : '💪 Keep Trying!' }}</h2>
          </div>

          <div class="score-body">
            <!-- Your Score -->
            <div class="score-section your-score">
              <div class="score-label">Your Score</div>
              <div class="score-value">{{ score }}%</div>
              <div class="score-breakdown">
                {{ getCorrectAnswersCount() }} out of {{ data?.fragments?.length || 0 }} correct
              </div>
            </div>

            <!-- Class Average -->
            <div class="score-section class-average">
              <div class="score-label">Class Average</div>
              <div *ngIf="classAverage !== null; else noAverage" class="score-value">{{ classAverage }}%</div>
              <ng-template #noAverage>
                <div class="score-value text-gray-500">--</div>
              </ng-template>
              <div *ngIf="totalAttempts > 0" class="score-breakdown">
                Based on {{ totalAttempts }} {{ totalAttempts === 1 ? 'student' : 'students' }}
              </div>
              <div *ngIf="totalAttempts === 0" class="score-breakdown text-gray-500">
                No data yet
              </div>
              <div *ngIf="classAverage !== null">
                <div class="comparison" *ngIf="score > classAverage">
                  🌟 Above average!
                </div>
                <div class="comparison" *ngIf="score === classAverage">
                  📊 Right on average
                </div>
                <div class="comparison" *ngIf="score < classAverage">
                  💪 Room to improve
                </div>
              </div>
            </div>
          </div>

          <div class="score-actions">
            <button class="btn-secondary" (click)="playAgain()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
              Play Again
            </button>
            <button class="btn-primary" (click)="complete()">
              Next
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions" *ngIf="!showScore">
        <button 
          class="submit-btn" 
          (click)="checkAnswers()"
          [disabled]="selectedFragments.size === 0"
        >
          Check My Answer
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
      padding: 1rem;
      gap: 1rem;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      color: #ffffff;
      min-height: 100%;
    }

    .target-statement {
      text-align: center;
      padding: 1rem;
      background: rgba(0, 212, 255, 0.1);
      border: 2px solid rgba(0, 212, 255, 0.3);
      border-radius: 12px;
    }

    .label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .statement {
      font-size: 1rem;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.6;
    }

    .fragments-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin: 0 auto;
      width: 100%;
    }

    .fragment-tile {
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      padding: 1rem;
      min-height: 90px;
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
      font-size: 0.875rem;
      font-weight: 500;
      color: #ffffff;
      text-align: center;
      line-height: 1.3;
    }

    .fragment-feedback {
      position: absolute;
      top: 0.375rem;
      right: 0.375rem;
    }

    .feedback-icon {
      font-size: 1.25rem;
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

    /* Score Modal */
    .score-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .score-modal {
      background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
      border-radius: 16px;
      padding: 2rem;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .score-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .score-header h2 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }

    .score-body {
      display: flex;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .score-section {
      flex: 1;
      text-align: center;
      padding: 1.5rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .score-section.your-score {
      border-color: #00d4ff;
      background: rgba(0, 212, 255, 0.1);
    }

    .score-section.class-average {
      border-color: #ffc107;
      background: rgba(255, 193, 7, 0.1);
    }

    .score-section .score-label {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .score-section .score-value {
      font-size: 3rem;
      font-weight: 700;
      color: #ffffff;
      line-height: 1;
      margin-bottom: 0.5rem;
    }

    .score-section.your-score .score-value {
      color: #00d4ff;
    }

    .score-section.class-average .score-value {
      color: #ffc107;
    }

    .score-section .score-breakdown {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .comparison {
      margin-top: 0.75rem;
      padding: 0.5rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .score-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn-primary, .btn-secondary {
      padding: 0.875rem 2rem;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #00d4ff;
      color: #0f0f23;
    }

    .btn-primary:hover {
      background: #00bce6;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 212, 255, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.4);
    }

    @media (max-width: 768px) {
      .score-body {
        flex-direction: column;
        gap: 1rem;
      }

      .score-section .score-value {
        font-size: 2.5rem;
      }

      .btn-primary, .btn-secondary {
        flex: 1;
      }
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
  private http = inject(HttpClient);

  @Input() data: TrueFalseSelectionData | null = null;
  @Input() lessonId: string | null = null;
  @Input() stageId: string | null = null;
  @Input() substageId: string | null = null;
  @Output() completed = new EventEmitter<{ score: number; selectedFragments: string[] }>();

  selectedFragments: Set<number> = new Set();
  showScore = false;
  score = 0;
  classAverage: number | null = null;
  totalAttempts: number = 0;
  percentile: number = 0;

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
  
  getCorrectAnswersCount(): number {
    if (!this.data) return 0;
    let correct = 0;
    this.data.fragments.forEach((frag, idx) => {
      const isSelected = this.selectedFragments.has(idx);
      const isCorrect = (isSelected && frag.isTrueInContext) || (!isSelected && !frag.isTrueInContext);
      if (isCorrect) correct++;
    });
    return correct;
  }

  async checkAnswers() {
    if (!this.data) return;

    console.log('[TrueFalseSelection] ═══════════════════════════════════════');
    console.log('[TrueFalseSelection] 🔍 SCORE CALCULATION DEBUG');
    console.log('[TrueFalseSelection] ═══════════════════════════════════════');

    const totalFragments = this.data.fragments.length;
    let correctPoints = 0;
    
    // 1 point for each correct answer:
    // - Selected TRUE = +1 point
    // - Unselected FALSE = +1 point
    this.data.fragments.forEach((frag, idx) => {
      const isSelected = this.selectedFragments.has(idx);
      const isCorrect = (isSelected && frag.isTrueInContext) || (!isSelected && !frag.isTrueInContext);
      if (isCorrect) {
        correctPoints++;
      }
    });

    console.log('[TrueFalseSelection] 📊 Raw Data:');
    console.log('  - Total fragments:', totalFragments);
    console.log('  - Correct points:', correctPoints);
    console.log('  - Selected fragments:', Array.from(this.selectedFragments));
    
    // Debug each fragment
    console.log('[TrueFalseSelection] 📝 Fragment Analysis:');
    this.data.fragments.forEach((frag, idx) => {
      const isSelected = this.selectedFragments.has(idx);
      const isCorrect = (isSelected && frag.isTrueInContext) || (!isSelected && !frag.isTrueInContext);
      console.log(`  [${idx}] ${isSelected ? '✓' : '○'} ${frag.isTrueInContext ? 'TRUE' : 'FALSE'} ${isCorrect ? '✅' : '❌'}: "${frag.text}"`);
    });

    // Score = Correct Points / Total * 100
    const calculatedScore = totalFragments > 0 ? Math.round((correctPoints / totalFragments) * 100) : 0;
    
    console.log('[TrueFalseSelection] 🧮 Calculation:');
    console.log('  - Correct points:', correctPoints, 'out of', totalFragments);
    console.log('  - Formula: (', correctPoints, '/', totalFragments, ') * 100');
    console.log('  - Calculated Score:', calculatedScore, '%');
    
    this.score = calculatedScore;
    console.log('[TrueFalseSelection] ✅ this.score SET TO:', this.score, '%');

    // Save result and get class average
    await this.saveResultAndFetchAverage();

    console.log('[TrueFalseSelection] 🎯 FINAL CHECK BEFORE MODAL:');
    console.log('  - this.score:', this.score, '%');
    console.log('  - this.classAverage:', this.classAverage, '%');
    console.log('  - this.totalAttempts:', this.totalAttempts);
    console.log('  - this.showScore:', this.showScore, '→ true');
    console.log('[TrueFalseSelection] ═══════════════════════════════════════');
    
    this.showScore = true;
  }

  private async saveResultAndFetchAverage() {
    if (!this.lessonId || !this.stageId || !this.substageId) {
      console.warn('[TrueFalseSelection] Missing context IDs, skipping save');
      return;
    }

    try {
      const response = await this.http.post<any>(`${environment.apiUrl}/interaction-results`, {
        lessonId: this.lessonId,
        stageId: this.stageId,
        substageId: this.substageId,
        interactionTypeId: 'true-false-selection',
        score: this.score,
        timeTakenSeconds: null, // TODO: Track time
        attempts: 1,
        resultData: {
          selectedFragments: Array.from(this.selectedFragments),
          correctCount: this.getCorrectCount(),
          incorrectCount: Array.from(this.selectedFragments)
            .filter(index => !this.data!.fragments[index].isTrueInContext).length,
        }
      }).toPromise();

      if (response) {
        this.classAverage = response.classAverage;
        this.totalAttempts = response.totalAttempts;
        this.percentile = response.percentile;
        console.log('[TrueFalseSelection] 📊 Class Stats Retrieved:');
        console.log('  - Your Score:', this.score, '%');
        console.log('  - Class Average:', this.classAverage, '%');
        console.log('  - Total Attempts:', this.totalAttempts);
        console.log('  - Your Percentile:', this.percentile);
        if (this.classAverage !== null) {
          console.log('  - Performance:', this.score > this.classAverage ? '🌟 Above Average!' : this.score === this.classAverage ? '📊 On Average' : '💪 Below Average');
        }
      }
    } catch (error) {
      console.error('[TrueFalseSelection] Failed to save result:', error);
      // Continue anyway - show popup without class average
    }
  }

  playAgain() {
    // Reset the interaction
    this.selectedFragments.clear();
    this.showScore = false;
    this.score = 0;
    this.classAverage = null;
    console.log('[TrueFalseSelection] Restarting interaction');
  }

  closeScoreModal(event: Event) {
    // Only close if clicking the overlay (not the modal content)
    if (event.target === event.currentTarget) {
      this.showScore = false;
    }
  }

  complete() {
    const selectedTexts = Array.from(this.selectedFragments).map(i => this.data!.fragments[i].text);
    
    this.completed.emit({
      score: this.score,
      selectedFragments: selectedTexts
    });
  }
}

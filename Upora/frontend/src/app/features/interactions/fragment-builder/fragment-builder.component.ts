import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as PIXI from 'pixi.js';

interface Fragment {
  text: string;
  isTrueInContext: boolean;
  explanation: string;
}

interface FragmentBuilderData {
  fragments: Fragment[];
  targetStatement: string;
  maxFragments: number;
}

@Component({
  selector: 'app-fragment-builder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fragment-builder-container">
      <!-- Target Statement -->
      <div class="target-statement">
        <div class="label">Build the correct statement:</div>
        <div class="statement">{{ data?.targetStatement || 'Loading...' }}</div>
      </div>

      <!-- Pixi Canvas -->
      <div class="canvas-container" #canvasContainer>
        <canvas #pixiCanvas></canvas>
      </div>

      <!-- Instructions -->
      <div class="instructions">
        <p>Tap the TRUE statements to build the correct sentence.</p>
        <p class="hint">Tap and hold for explanations</p>
      </div>

      <!-- Score Display -->
      <div *ngIf="showScore" class="score-display" [class.perfect]="score === 100">
        <div class="score-label">Score:</div>
        <div class="score-value">{{ score }}%</div>
        <div *ngIf="score === 100" class="perfect-message">Perfect! 🎉</div>
      </div>

      <!-- Submit Button -->
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
        Continue
      </button>
    </div>
  `,
  styles: [`
    .fragment-builder-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 2rem;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      color: #ffffff;
    }

    .target-statement {
      text-align: center;
      margin-bottom: 2rem;
    }

    .label {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0.5rem;
    }

    .statement {
      font-size: 1.25rem;
      font-weight: 600;
      color: #00d4ff;
      line-height: 1.6;
    }

    .canvas-container {
      flex: 1;
      position: relative;
      min-height: 400px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    canvas {
      max-width: 100%;
      max-height: 100%;
    }

    .instructions {
      text-align: center;
      margin: 1.5rem 0;
    }

    .instructions p {
      margin: 0.5rem 0;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.875rem;
    }

    .hint {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .score-display {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 1rem;
    }

    .score-display.perfect {
      background: rgba(76, 175, 80, 0.2);
      border-color: #4caf50;
    }

    .score-label {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0.5rem;
    }

    .score-value {
      font-size: 3rem;
      font-weight: 700;
      color: #00d4ff;
    }

    .score-display.perfect .score-value {
      color: #4caf50;
    }

    .perfect-message {
      font-size: 1.25rem;
      color: #4caf50;
      margin-top: 1rem;
      font-weight: 600;
    }

    .submit-btn, .continue-btn {
      padding: 1rem 2rem;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
      max-width: 300px;
      margin: 0 auto;
      display: block;
    }

    .submit-btn {
      background: #00d4ff;
      color: #0f0f23;
    }

    .submit-btn:hover:not(:disabled) {
      background: #00bce6;
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.4);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .continue-btn {
      background: #4caf50;
      color: white;
    }

    .continue-btn:hover {
      background: #45a049;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
    }

    @media (max-width: 768px) {
      .fragment-builder-container {
        padding: 1rem;
      }

      .canvas-container {
        min-height: 300px;
      }

      .statement {
        font-size: 1rem;
      }
    }
  `]
})
export class FragmentBuilderComponent implements OnInit, OnDestroy {
  @Input() data: FragmentBuilderData | null = null;
  @Output() completed = new EventEmitter<{ score: number; selectedFragments: string[] }>();

  @ViewChild('pixiCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private app: PIXI.Application | null = null;
  private fragmentSprites: Map<number, PIXI.Container> = new Map();
  selectedFragments: Set<number> = new Set();
  showScore = false;
  score = 0;

  async ngOnInit() {
    if (this.data) {
      await this.initPixi();
      this.createFragments();
    }
  }

  ngOnDestroy() {
    if (this.app) {
      this.app.destroy(true, { children: true });
    }
  }

  private async initPixi() {
    const canvas = this.canvasRef.nativeElement;
    const container = this.containerRef.nativeElement;

    this.app = new PIXI.Application();
    await this.app.init({
      canvas,
      width: container.clientWidth,
      height: Math.max(container.clientHeight, 400),
      backgroundColor: 0x0f0f23,
      antialias: true,
    });

    console.log('[FragmentBuilder] Pixi initialized');
  }

  private createFragments() {
    if (!this.app || !this.data) return;

    const fragments = this.data.fragments;
    const padding = 20;
    const fragmentsPerRow = window.innerWidth < 768 ? 2 : 3;
    const fragmentWidth = (this.app.screen.width - (padding * (fragmentsPerRow + 1))) / fragmentsPerRow;
    const fragmentHeight = 80;

    fragments.forEach((fragment, index) => {
      const row = Math.floor(index / fragmentsPerRow);
      const col = index % fragmentsPerRow;
      const x = padding + col * (fragmentWidth + padding);
      const y = padding + row * (fragmentHeight + padding);

      const fragmentContainer = this.createFragmentTile(fragment, index, x, y, fragmentWidth, fragmentHeight);
      this.fragmentSprites.set(index, fragmentContainer);
      this.app!.stage.addChild(fragmentContainer);
    });

    console.log('[FragmentBuilder] Created', fragments.length, 'fragments');
  }

  private createFragmentTile(
    fragment: Fragment,
    index: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): PIXI.Container {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    container.eventMode = 'static';
    container.cursor = 'pointer';

    // Background
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, width, height);
    bg.fill({ color: 0x1a1a2e });
    bg.stroke({ color: 0x00d4ff, width: 2, alpha: 0.3 });
    container.addChild(bg);

    // Text
    const text = new PIXI.Text({
      text: fragment.text,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: width - 20,
        align: 'center',
      }
    });
    text.x = width / 2;
    text.y = height / 2;
    text.anchor.set(0.5);
    container.addChild(text);

    // Tap/Click Handler
    container.on('pointerdown', () => this.onFragmentTap(index, container, bg, fragment));

    // Tap-and-hold for explanation (future enhancement)
    // For now, just tap to select

    return container;
  }

  private onFragmentTap(index: number, container: PIXI.Container, bg: PIXI.Graphics, fragment: Fragment) {
    if (this.showScore) return; // Locked after checking answers

    const isSelected = this.selectedFragments.has(index);

    if (isSelected) {
      // Deselect
      this.selectedFragments.delete(index);
      bg.clear();
      bg.rect(0, 0, container.width, container.height);
      bg.fill({ color: 0x1a1a2e });
      bg.stroke({ color: 0x00d4ff, width: 2, alpha: 0.3 });
    } else {
      // Select
      this.selectedFragments.add(index);
      bg.clear();
      bg.rect(0, 0, container.width, container.height);
      bg.fill({ color: 0x00d4ff, alpha: 0.2 });
      bg.stroke({ color: 0x00d4ff, width: 3 });
    }

    console.log('[FragmentBuilder] Fragment', index, isSelected ? 'deselected' : 'selected');
  }

  checkAnswers() {
    if (!this.data) return;

    const trueFragments = this.data.fragments
      .map((f, i) => ({ fragment: f, index: i }))
      .filter(item => item.fragment.isTrueInContext);

    const correctSelections = Array.from(this.selectedFragments)
      .filter(index => this.data!.fragments[index].isTrueInContext);

    this.score = Math.round((correctSelections.length / trueFragments.length) * 100);
    this.showScore = true;

    // Visual feedback on fragments
    this.data.fragments.forEach((fragment, index) => {
      const sprite = this.fragmentSprites.get(index);
      if (!sprite) return;

      const bg = sprite.children[0] as PIXI.Graphics;
      const isSelected = this.selectedFragments.has(index);
      const isTrue = fragment.isTrueInContext;

      bg.clear();
      bg.rect(0, 0, sprite.width, sprite.height);

      if (isTrue && isSelected) {
        // Correct selection - green
        bg.fill({ color: 0x4caf50, alpha: 0.3 });
        bg.stroke({ color: 0x4caf50, width: 3 });
      } else if (isTrue && !isSelected) {
        // Missed true fragment - show it was true
        bg.fill({ color: 0xffc107, alpha: 0.2 });
        bg.stroke({ color: 0xffc107, width: 2 });
      } else if (!isTrue && isSelected) {
        // Incorrectly selected - red
        bg.fill({ color: 0xf44336, alpha: 0.3 });
        bg.stroke({ color: 0xf44336, width: 3 });
      } else {
        // Correctly not selected - neutral
        bg.fill({ color: 0x1a1a2e });
        bg.stroke({ color: 0x666666, width: 2, alpha: 0.3 });
      }
    });

    console.log('[FragmentBuilder] Score:', this.score, '% -', correctSelections.length, '/', trueFragments.length, 'correct');
  }

  complete() {
    const selectedTexts = Array.from(this.selectedFragments).map(i => this.data!.fragments[i].text);
    
    this.completed.emit({
      score: this.score,
      selectedFragments: selectedTexts
    });
  }
}


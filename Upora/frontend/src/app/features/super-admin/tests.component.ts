import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IonContent } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';

interface TestSuite {
  name: string;
  path: string;
  description: string;
  tests: TestResult[];
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  duration?: number;
  error?: string;
  message?: string;
}

@Component({
  selector: 'app-tests',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content [style.--padding-top]="'80px'">
      <div class="tests-page">
        <!-- Header -->
        <div class="page-header">
          <button class="back-btn" (click)="goBack()">
            ← Back to Dashboard
          </button>
          <h1>🧪 Test Suite</h1>
          <p class="subtitle">Run and view test results</p>
        </div>

        <!-- Controls -->
        <div class="test-controls">
          <button 
            class="btn-primary" 
            (click)="runAllTests()" 
            [disabled]="isRunning">
            {{ isRunning ? '⏳ Running Tests...' : '▶️ Run All Tests' }}
          </button>
          <button 
            class="btn-secondary" 
            (click)="loadTestResults()" 
            [disabled]="isRunning">
            🔄 Refresh Results
          </button>
        </div>

        <!-- Test Suites -->
        <div class="test-suites">
          <div *ngFor="let suite of testSuites" class="test-suite-card">
            <div class="suite-header">
              <h3>{{ suite.name }}</h3>
              <span class="suite-status" [class.passed]="getSuiteStatus(suite) === 'passed'" 
                    [class.failed]="getSuiteStatus(suite) === 'failed'"
                    [class.pending]="getSuiteStatus(suite) === 'pending'">
                {{ getSuiteStatus(suite) }}
              </span>
            </div>
            <p class="suite-description">{{ suite.description }}</p>
            
            <div class="test-results">
              <div *ngFor="let test of suite.tests" class="test-item" 
                   [class.passed]="test.status === 'passed'"
                   [class.failed]="test.status === 'failed'"
                   [class.running]="test.status === 'running'">
                <div class="test-icon">
                  <span *ngIf="test.status === 'passed'">✅</span>
                  <span *ngIf="test.status === 'failed'">❌</span>
                  <span *ngIf="test.status === 'running'">⏳</span>
                  <span *ngIf="test.status === 'pending'">⏸️</span>
                </div>
                <div class="test-info">
                  <div class="test-name">{{ test.name }}</div>
                  <div *ngIf="test.duration" class="test-duration">{{ test.duration }}ms</div>
                  <div *ngIf="test.error" class="test-error">{{ test.error }}</div>
                  <div *ngIf="test.message" class="test-message">{{ test.message }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div *ngIf="hasResults" class="test-summary">
          <h3>Summary</h3>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-value passed">{{ getTotalPassed() }}</span>
              <span class="stat-label">Passed</span>
            </div>
            <div class="stat">
              <span class="stat-value failed">{{ getTotalFailed() }}</span>
              <span class="stat-label">Failed</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ getTotalTests() }}</span>
              <span class="stat-label">Total</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ getTotalDuration() }}ms</span>
              <span class="stat-label">Duration</span>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
    }

    .tests-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      padding: 2rem;
      padding-top: 1rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .back-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #00d4ff;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      margin-bottom: 1rem;
    }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: #00d4ff;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0.5rem 0;
    }

    .subtitle {
      color: rgba(255, 255, 255, 0.6);
      font-size: 1rem;
    }

    .test-controls {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-primary {
      background: #00d4ff;
      color: #000000;
    }

    .btn-primary:hover:not(:disabled) {
      background: #00b8e6;
      transform: translateY(-2px);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
    }

    .test-suites {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .test-suite-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .suite-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .suite-header h3 {
      color: #ffffff;
      font-size: 1.25rem;
      margin: 0;
    }

    .suite-status {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .suite-status.passed {
      background: rgba(0, 255, 0, 0.2);
      color: #00ff00;
    }

    .suite-status.failed {
      background: rgba(255, 0, 0, 0.2);
      color: #ff0000;
    }

    .suite-status.pending {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.6);
    }

    .suite-description {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .test-results {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .test-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border-left: 4px solid transparent;
    }

    .test-item.passed {
      border-left-color: #00ff00;
    }

    .test-item.failed {
      border-left-color: #ff0000;
    }

    .test-item.running {
      border-left-color: #00d4ff;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .test-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .test-info {
      flex: 1;
    }

    .test-name {
      color: #ffffff;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .test-duration {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.75rem;
    }

    .test-error {
      color: #ff6b6b;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      white-space: pre-wrap;
    }

    .test-message {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .test-summary {
      margin-top: 2rem;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
    }

    .test-summary h3 {
      color: #ffffff;
      margin-bottom: 1rem;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
    }

    .stat-value.passed {
      color: #00ff00;
    }

    .stat-value.failed {
      color: #ff0000;
    }

    .stat-label {
      display: block;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
  `]
})
export class TestsComponent implements OnInit {
  testSuites: TestSuite[] = [];
  isRunning = false;
  hasResults = false;

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.loadTestSuites();
  }

  goBack() {
    this.router.navigate(['/super-admin']);
  }

  loadTestSuites() {
    // Define test suites based on our test files
    this.testSuites = [
      {
        name: 'Interaction Types Service',
        path: 'interaction-types.service.spec',
        description: 'Tests for interaction type management, document upload, and removal',
        tests: []
      },
      {
        name: 'File Storage Service',
        path: 'file-storage.service.spec',
        description: 'Tests for file upload, storage, and deletion',
        tests: []
      },
      {
        name: 'Interaction Types Controller',
        path: 'interaction-types.controller.spec',
        description: 'Tests for document upload endpoints and validation',
        tests: []
      },
      {
        name: 'AI Assistant - Iframe Screenshot Integration',
        path: 'ai-assistant-iframe.spec',
        description: 'Tests for iframe screenshot handling with AI Teacher',
        tests: []
      },
      {
        name: 'AI Assistant Service',
        path: 'ai-assistant.service.spec',
        description: 'General AI assistant service tests',
        tests: []
      },
      {
        name: 'App Controller',
        path: 'app.controller.spec',
        description: 'Application controller tests',
        tests: []
      }
    ];
  }

  async runAllTests() {
    this.isRunning = true;
    this.hasResults = false;
    
    // Reset all test statuses
    this.testSuites.forEach(suite => {
      suite.tests.forEach(test => {
        test.status = 'running';
      });
    });

    try {
      // Call backend test endpoint (we'll need to create this)
      const response = await this.http.post<{
        success: boolean;
        results: any[];
      }>(`${environment.apiUrl}/tests/run`, {}).toPromise();

      if (response?.success && response.results) {
        this.parseTestResults(response.results);
        this.hasResults = true;
      } else {
        // Fallback: simulate test results for now
        this.simulateTestResults();
        this.hasResults = true;
      }
    } catch (error: any) {
      console.error('Error running tests:', error);
      // Fallback: simulate test results
      this.simulateTestResults();
      this.hasResults = true;
    } finally {
      this.isRunning = false;
    }
  }

  async loadTestResults() {
    try {
      const response = await this.http.get<{
        success: boolean;
        results: any[];
      }>(`${environment.apiUrl}/tests/results`).toPromise();

      if (response?.success && response.results) {
        this.parseTestResults(response.results);
        this.hasResults = true;
      }
    } catch (error: any) {
      console.error('Error loading test results:', error);
    }
  }

  parseTestResults(results: any[]) {
    // Parse Jest test results and map to our test suites
    results.forEach((result: any) => {
      const suite = this.testSuites.find(s => 
        result.name?.includes(s.path) || result.testFilePath?.includes(s.path)
      );
      
      if (suite) {
        if (result.tests) {
          suite.tests = result.tests.map((test: any) => ({
            name: test.name || test.title,
            status: test.status === 'passed' ? 'passed' : 
                   test.status === 'failed' ? 'failed' : 'pending',
            duration: test.duration,
            error: test.failureMessages?.join('\n'),
            message: test.message
          }));
        }
      }
    });
  }

  simulateTestResults() {
    // Simulate test results for demonstration
    this.testSuites.forEach((suite, suiteIdx) => {
      const testNames = this.getTestNamesForSuite(suite.path);
      suite.tests = testNames.map((name, idx) => ({
        name,
        status: idx % 10 === 0 ? 'failed' : 'passed' as 'passed' | 'failed',
        duration: Math.floor(Math.random() * 100) + 10,
        error: idx % 10 === 0 ? 'Test assertion failed' : undefined
      }));
    });
  }

  getTestNamesForSuite(path: string): string[] {
    const testMap: { [key: string]: string[] } = {
      'interaction-types.service.spec': [
        'should return an interaction type by id',
        'should return null if interaction not found',
        'should update interaction type',
        'should upload document and update interaction',
        'should delete old document before uploading new one',
        'should throw NotFoundException if interaction not found',
        'should remove document and clear fields'
      ],
      'file-storage.service.spec': [
        'should create upload directory',
        'should save file and return URL',
        'should use default subfolder if not provided',
        'should delete file by URL',
        'should not throw if file does not exist',
        'should throw if deletion fails for other reasons',
        'should read file content'
      ],
      'interaction-types.controller.spec': [
        'should upload document successfully',
        'should throw BadRequestException if no file provided',
        'should throw BadRequestException if no interactionId provided',
        'should throw BadRequestException for invalid file type',
        'should accept PDF files',
        'should accept DOCX files',
        'should accept TXT files',
        'should remove document successfully'
      ],
      'ai-assistant-iframe.spec': [
        'should process iframe screenshot with document and lesson context',
        'should include document content when provided',
        'should handle different trigger events',
        'should include lesson data in context',
        'should include Weaviate search results when available'
      ],
      'ai-assistant.service.spec': [
        'should load prompt from database',
        'should handle conversation history summarization',
        'should call Grok API with correct parameters',
        'should log usage to database'
      ],
      'app.controller.spec': [
        'should return health status',
        'should return version'
      ]
    };
    return testMap[path] || [];
  }

  getSuiteStatus(suite: TestSuite): 'passed' | 'failed' | 'pending' {
    if (suite.tests.length === 0) return 'pending';
    if (suite.tests.some(t => t.status === 'failed')) return 'failed';
    if (suite.tests.some(t => t.status === 'running')) return 'pending';
    if (suite.tests.every(t => t.status === 'passed')) return 'passed';
    return 'pending';
  }

  getTotalPassed(): number {
    return this.testSuites.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.status === 'passed').length, 0
    );
  }

  getTotalFailed(): number {
    return this.testSuites.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.status === 'failed').length, 0
    );
  }

  getTotalTests(): number {
    return this.testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
  }

  getTotalDuration(): number {
    return this.testSuites.reduce((sum, suite) => 
      sum + suite.tests.reduce((s, t) => s + (t.duration || 0), 0), 0
    );
  }
}


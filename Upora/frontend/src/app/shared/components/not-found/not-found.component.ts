import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="not-found-container">
      <div class="error-content">
        <div class="error-icon">🔍</div>
        <h1 class="error-title">404</h1>
        <h2 class="error-subtitle">Page Not Found</h2>
        <p class="error-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div class="error-actions">
          <button class="btn-primary" (click)="goHome()">
            🏠 Go to Home
          </button>
          <button class="btn-secondary" (click)="goBack()">
            ← Go Back
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      padding: 2rem;
    }

    .error-content {
      text-align: center;
      max-width: 600px;
    }

    .error-icon {
      font-size: 6rem;
      margin-bottom: 1rem;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }

    .error-title {
      font-size: 6rem;
      font-weight: 800;
      color: #ff3b3f;
      margin: 0;
      line-height: 1;
    }

    .error-subtitle {
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
      margin: 1rem 0;
    }

    .error-message {
      font-size: 1.125rem;
      color: rgba(255, 255, 255, 0.7);
      margin: 1.5rem 0 2.5rem;
      line-height: 1.6;
    }

    .error-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary {
      padding: 0.875rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      min-width: 150px;
    }

    .btn-primary {
      background: #ff3b3f;
      color: white;
    }

    .btn-primary:hover {
      background: #e02f33;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 59, 63, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #00d4ff;
      border: 1px solid rgba(0, 212, 255, 0.3);
    }

    .btn-secondary:hover {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
      transform: translateY(-2px);
    }

    @media (max-width: 640px) {
      .error-title {
        font-size: 4rem;
      }

      .error-subtitle {
        font-size: 1.5rem;
      }

      .error-message {
        font-size: 1rem;
      }

      .error-actions {
        flex-direction: column;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class NotFoundComponent {
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/home']);
  }

  goBack() {
    window.history.back();
  }
}


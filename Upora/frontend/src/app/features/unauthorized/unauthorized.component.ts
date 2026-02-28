import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content>
      <div class="min-h-screen bg-brand-black text-white flex items-center justify-center page-with-header">
        <div class="text-center max-w-md px-6">
          <div class="text-6xl mb-6">🔒</div>
          <h1 class="text-3xl font-bold mb-4">Access Restricted</h1>
          <p class="text-gray-400 mb-8">
            Your current account doesn't have permission to view this page.
            If you believe this is an error, please contact your administrator.
          </p>
          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button (click)="goHome()" class="bg-brand-red text-white font-bold py-3 px-8 rounded hover:bg-opacity-80 transition">
              Go Home
            </button>
            <button *ngIf="!isLoggedIn" (click)="goLogin()" class="bg-gray-700 text-white font-bold py-3 px-8 rounded hover:bg-gray-600 transition">
              Sign In
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .page-with-header { padding-top: 64px; }
    @media (min-width: 768px) { .page-with-header { padding-top: 80px; } }
  `]
})
export class UnauthorizedComponent {
  isLoggedIn = false;

  constructor(private router: Router, private auth: AuthService) {
    this.isLoggedIn = auth.isAuthenticated();
  }

  goHome() { this.router.navigate(['/home']); }
  goLogin() { this.router.navigate(['/login']); }
}

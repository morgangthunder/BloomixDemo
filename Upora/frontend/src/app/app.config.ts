import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authHeadersInterceptor } from './core/interceptors/auth-headers.interceptor';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { CacheBustService } from './core/services/cache-bust.service';
import { AuthService } from './core/services/auth.service';

export function initAuth(auth: AuthService): () => Promise<void> {
  return () => auth.initCognito();
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: APP_INITIALIZER, useFactory: initAuth, deps: [AuthService], multi: true },
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideIonicAngular({}),
    provideHttpClient(withInterceptors([authHeadersInterceptor]), withInterceptorsFromDi()),
    CacheBustService // Initialize cache bust service on app start
  ]
};

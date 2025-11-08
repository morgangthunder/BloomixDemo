import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// ========================================
// 🔥 FRONTEND VERSION 0.0.11 🔥
// ========================================
const FRONTEND_VERSION = '0.0.11';
const CACHE_BUST_ID = Math.random().toString(36).substr(2, 9);
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log(`🔥🔥🔥 FRONTEND VERSION ${FRONTEND_VERSION} LOADED 🔥🔥🔥`);
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🆔 Cache Bust ID: ${CACHE_BUST_ID}`);
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Force clear all caches
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log(`🗑️ Deleted cache: ${name}`);
    });
  });
}

// Add unique timestamp to prevent any caching
const timestamp = Date.now();
console.log(`⏰ Application bootstrap timestamp: ${timestamp}`);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

// ========================================
// 🔥 FRONTEND VERSION 0.4.75 🔥
// ========================================
const FRONTEND_VERSION = '0.4.75';
const CACHE_BUST_ID = Math.random().toString(36).substr(2, 9);
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log(`🔥🔥🔥 FRONTEND VERSION ${FRONTEND_VERSION} LOADED 🔥🔥🔥`);
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🆔 Cache Bust ID: ${CACHE_BUST_ID}`);
console.log(`✅ Draft API Integration | MM:SS Time Input | DB-First`);
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Fetch and display backend version
fetch(`${environment.apiUrl}/version`)
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  })
  .then(data => {
    if (data && data.version) {
      console.log(`🔥🔥🔥 BACKEND VERSION ${data.version} 🔥🔥🔥`);
      console.log(`📅 Backend Timestamp: ${data.timestamp}`);
    } else {
      console.warn('⚠️ Backend version endpoint returned invalid data:', data);
    }
  })
  .catch(err => {
    console.warn('⚠️ Could not fetch backend version:', err.message);
    console.warn('⚠️ Make sure the backend is running on http://localhost:3000');
  });

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

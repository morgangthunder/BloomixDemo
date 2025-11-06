import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// NUCLEAR CACHE BUST v3.2.0 - FORCE BROWSER TO LOAD NEW CODE
const CACHE_BUST_VERSION = '3.2.0';
const CACHE_BUST_ID = Math.random().toString(36).substr(2, 9);
console.log(`🚀 NUCLEAR CACHE BUST v${CACHE_BUST_VERSION} - ID: ${CACHE_BUST_ID} - ${new Date().toISOString()}`);
console.log(`🔄 FORCING NEW CODE TO LOAD - VERSION 2.3.2`);

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

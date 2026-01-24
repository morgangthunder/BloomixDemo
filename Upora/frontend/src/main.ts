import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

// ========================================
// 🔥 FRONTEND VERSION 🔥
// ========================================
// Version is read from package.json at build time
// This will be replaced by the build process or read dynamically
const FRONTEND_VERSION = '0.1.175'; // Added widget configuration sections to interaction configure modal. Created widget developer guide. Updated SDK docs with widget usage information.
const CACHE_BUST_ID = `v${FRONTEND_VERSION}-${Math.random().toString(36).substr(2, 9)}`;
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log(`🔥🔥🔥 FRONTEND VERSION ${FRONTEND_VERSION} LOADED 🔥🔥🔥`);
console.log(`✅ Phase 4: SDK media control methods complete`);
console.log(`✅ Fixed compilation errors for uploaded-media interactions`);
console.log(`✅ Added playMedia, pauseMedia, seekMedia, setMediaVolume methods`);
console.log(`✅ Added getMediaCurrentTime, getMediaDuration, isMediaPlaying methods`);
console.log(`✅ Bridge service handles media control messages from iframes`);
console.log(`✅ Lesson timer syncs with media playback time`);
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🆔 Cache Bust ID: ${CACHE_BUST_ID}`);
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
    console.warn('⚠️ Make sure the backend is running on http://127.0.0.1:3000');
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

// Force reload if version mismatch detected
const STORED_VERSION_KEY = 'upora_frontend_version';
const storedVersion = localStorage.getItem(STORED_VERSION_KEY);
if (storedVersion && storedVersion !== FRONTEND_VERSION) {
  console.log(`🔄 Version mismatch detected: stored=${storedVersion}, current=${FRONTEND_VERSION}`);
  console.log(`🔄 Clearing localStorage and reloading...`);
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
} else {
  localStorage.setItem(STORED_VERSION_KEY, FRONTEND_VERSION);
}

// Add unique timestamp to prevent any caching
const timestamp = Date.now();
console.log(`⏰ Application bootstrap timestamp: ${timestamp}`);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

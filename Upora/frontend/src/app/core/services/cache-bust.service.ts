import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CacheBustService {
  private static readonly VERSION_KEY = 'app_version';
  private static readonly CURRENT_VERSION = '3.1.0';
  private static readonly UNIQUE_ID = Math.random().toString(36).substr(2, 9);

  constructor() {
    this.checkVersion();
  }

  private checkVersion(): void {
    const storedVersion = localStorage.getItem(CacheBustService.VERSION_KEY);
    const currentVersion = CacheBustService.CURRENT_VERSION;
    
    console.log(`🔍 Cache Check - Stored: ${storedVersion}, Current: ${currentVersion}`);
    
    if (storedVersion !== currentVersion) {
      console.log(`🚀 NEW VERSION DETECTED: ${currentVersion} - CLEARING ALL CACHES`);
      this.clearAllCaches();
      localStorage.setItem(CacheBustService.VERSION_KEY, currentVersion);
    } else {
      console.log(`✅ Same version detected: ${currentVersion}`);
    }
  }

  private clearAllCaches(): void {
    // Clear localStorage
    const keysToKeep = ['app_version'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
        console.log(`🗑️ Cleared localStorage: ${key}`);
      }
    });

    // Clear sessionStorage
    sessionStorage.clear();
    console.log(`🗑️ Cleared sessionStorage`);

    // Clear service worker caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
          console.log(`🗑️ Deleted cache: ${name}`);
        });
      });
    }

    // Force reload if needed
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
          console.log(`🗑️ Unregistered service worker: ${registration.scope}`);
        });
      });
    }
  }

  public getVersionInfo(): { version: string; id: string; timestamp: string } {
    return {
      version: CacheBustService.CURRENT_VERSION,
      id: CacheBustService.UNIQUE_ID,
      timestamp: new Date().toISOString()
    };
  }

  public forceVersionCheck(): void {
    console.log(`🔄 FORCE VERSION CHECK - ${CacheBustService.CURRENT_VERSION}`);
    this.checkVersion();
  }
}

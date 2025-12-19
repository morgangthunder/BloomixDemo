import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read version from package.json
let BACKEND_VERSION = '0.1.35'; // Added videoUrlConfig field to InteractionType entity
console.log(`🔍 [AppController VERSION DEBUG] __dirname: ${__dirname}`);
console.log(`🔍 [AppController VERSION DEBUG] process.cwd(): ${process.cwd()}`);

try {
  // Try multiple possible paths (for different build/run scenarios)
  const possiblePaths = [
    join(__dirname, '../../package.json'), // When running from dist/
    join(__dirname, '../../../package.json'), // Alternative path
    join(process.cwd(), 'package.json'), // When running from project root
  ];
  
  console.log(`🔍 [AppController VERSION DEBUG] Trying paths:`, possiblePaths);
  
  let packageJson: any = null;
  for (const packageJsonPath of possiblePaths) {
    try {
      console.log(`🔍 [AppController VERSION DEBUG] Attempting to read: ${packageJsonPath}`);
      packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      console.log(`✅ [AppController] Read version from: ${packageJsonPath}`);
      console.log(`🔍 [AppController VERSION DEBUG] package.json version: ${packageJson.version}`);
      break;
    } catch (err: any) {
      console.log(`⚠️ [AppController VERSION DEBUG] Failed to read ${packageJsonPath}:`, err.message);
      // Try next path
    }
  }
  
  if (packageJson && packageJson.version) {
    BACKEND_VERSION = packageJson.version;
    console.log(`✅ [AppController VERSION DEBUG] Final version set to: ${BACKEND_VERSION}`);
  } else {
    console.warn(`⚠️ [AppController VERSION DEBUG] No version found in package.json, using fallback: ${BACKEND_VERSION}`);
  }
} catch (error: any) {
  console.warn('⚠️ Could not read version from package.json, using default:', BACKEND_VERSION);
  console.warn('⚠️ Error details:', error.message || error);
}

console.log(`🔍 [AppController VERSION DEBUG] BACKEND_VERSION final value: ${BACKEND_VERSION}`);

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'Upora Backend is running',
      timestamp: new Date().toISOString(),
      version: BACKEND_VERSION,
    };
  }

  @Get('version')
  getVersion() {
    return {
      version: BACKEND_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  getHello() {
    return this.appService.getHello();
  }
}
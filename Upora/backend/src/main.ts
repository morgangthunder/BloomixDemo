import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Read version from package.json
import { readFileSync } from 'fs';
import { join } from 'path';

let BACKEND_VERSION = '0.1.24'; // Fixed file path resolution for media files, improved alternative path checking
console.log(`🔍 [VERSION DEBUG] __dirname: ${__dirname}`);
console.log(`🔍 [VERSION DEBUG] process.cwd(): ${process.cwd()}`);

try {
  // Try multiple possible paths (for different build/run scenarios)
  const possiblePaths = [
    join(__dirname, '../package.json'), // When running from dist/
    join(__dirname, '../../package.json'), // Alternative path
    join(process.cwd(), 'package.json'), // When running from project root
  ];
  
  console.log(`🔍 [VERSION DEBUG] Trying paths:`, possiblePaths);
  
  let packageJson: any = null;
  for (const packageJsonPath of possiblePaths) {
    try {
      console.log(`🔍 [VERSION DEBUG] Attempting to read: ${packageJsonPath}`);
      packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      console.log(`✅ Read version from: ${packageJsonPath}`);
      console.log(`🔍 [VERSION DEBUG] package.json content:`, JSON.stringify({ version: packageJson.version }));
      break;
    } catch (err: any) {
      console.log(`⚠️ [VERSION DEBUG] Failed to read ${packageJsonPath}:`, err.message);
      // Try next path
    }
  }
  
  if (packageJson && packageJson.version) {
    BACKEND_VERSION = packageJson.version;
    console.log(`✅ [VERSION DEBUG] Final version set to: ${BACKEND_VERSION}`);
  } else {
    console.warn(`⚠️ [VERSION DEBUG] No version found in package.json, using fallback: ${BACKEND_VERSION}`);
  }
} catch (error: any) {
  console.warn('⚠️ Could not read version from package.json, using default:', BACKEND_VERSION);
  console.warn('⚠️ Error details:', error.message || error);
}

console.log(`🔍 [VERSION DEBUG] BACKEND_VERSION final value: ${BACKEND_VERSION}`);

async function bootstrap() {
  console.log(`🔥🔥🔥 BACKEND VERSION ${BACKEND_VERSION} STARTING 🔥🔥🔥`);
  console.log(`✅ Processed outputs query now searches via content sources when lessonId match fails`);
  console.log(`✅ Added LessonDataLink repository for content source lookup`);
  console.log(`✅ Improved getProcessedOutputs to handle indirect lesson-content links`);
  console.log(`✅ Added detailed logging for processed output discovery`);
  
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });
  
  // Enable CORS for frontend (including WebSocket)
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:8100'];
  
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  // Global prefix for all API routes
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  // ========================================
  // 🔥 BACKEND VERSION 0.0.7 - APPROVAL REQUIRES PROCESSED CONTENT & ALWAYS CREATES OUTPUT 🔥
  // ========================================
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🔥🔥🔥 BACKEND VERSION ${BACKEND_VERSION} STARTED 🔥🔥🔥`);
  console.log(`✅ Approval now requires processed content creation - will not approve if processing fails`);
  console.log('🔧 Transform API Response | Field Mapping for Frontend');
  console.log(`🚀 API running on: http://localhost:${port}/api`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}
bootstrap();
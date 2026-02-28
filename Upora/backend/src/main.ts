import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Read version from package.json
import { readFileSync } from 'fs';
import { join } from 'path';

let BACKEND_VERSION = '0.8.42'; // Semantic negative prompts + systemInstruction for text-free full-bleed images
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
    bodyParser: false,
  });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Enable CORS for frontend (including WebSocket)
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:8100', 'http://127.0.0.1:4200', 'http://127.0.0.1:3000', 'http://127.0.0.1:8100'];
  
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-tenant-id', 'x-user-role'],
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

  // ── Run critical schema migrations BEFORE any request handling ──
  try {
    const { DataSource } = require('typeorm');
    const ds: any = app.get(DataSource);
    if (ds?.isInitialized) {
      await ds.query(`ALTER TABLE hubs ADD COLUMN IF NOT EXISTS auth_config JSONB`);
      await ds.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(255) DEFAULT 'cognito'`);
      await ds.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_sub VARCHAR(500)`);
      await ds.query(`ALTER TABLE hubs ADD COLUMN IF NOT EXISTS shelf_config JSONB`);

      // ── Phase 4: Content Caching columns on generated_images ──
      await ds.query(`ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS param_hash VARCHAR(64)`);
      await ds.query(`ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS personalisation_tags TEXT[]`);
      await ds.query(`ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS component_map JSONB`);
      await ds.query(`ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS dictionary_labels TEXT[]`);
      await ds.query(`CREATE INDEX IF NOT EXISTS idx_generated_images_param_hash ON generated_images (param_hash)`);
      await ds.query(`CREATE INDEX IF NOT EXISTS idx_generated_images_dict_labels ON generated_images USING GIN (dictionary_labels)`);

      // ── Phase 4: processed_content_cache table ──
      await ds.query(`
        CREATE TABLE IF NOT EXISTS processed_content_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          content_type VARCHAR(50) NOT NULL,
          param_hash VARCHAR(64) NOT NULL,
          source_content_id UUID,
          lesson_id UUID,
          output_reference_id UUID,
          output_type VARCHAR(50),
          personalisation_tags TEXT[],
          cached_data JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, content_type, param_hash)
        )
      `);
      await ds.query(`CREATE INDEX IF NOT EXISTS idx_pcc_param_hash ON processed_content_cache (param_hash)`);

      console.log('✅ SSO + shelf + content-cache schema columns verified');
    }
  } catch (e: any) {
    console.warn('⚠️ SSO schema migration skipped:', e.message);
  }
  
  const port = process.env.PORT || 3000;
  // Bind to 0.0.0.0 so Docker port mapping works; 127.0.0.1 causes ERR_EMPTY_RESPONSE from host
  await app.listen(port, '0.0.0.0');
  
  // ========================================
  // 🔥 BACKEND VERSION 0.0.7 - APPROVAL REQUIRES PROCESSED CONTENT & ALWAYS CREATES OUTPUT 🔥
  // ========================================
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🔥🔥🔥 BACKEND VERSION ${BACKEND_VERSION} STARTED 🔥🔥🔥`);
  console.log(`✅ Phase 6: Transcripts in MinIO/S3; POST session/transcript; lesson-view capture + flush`);
  console.log(`🚀 API running on: http://localhost:${port}/api`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}
bootstrap();
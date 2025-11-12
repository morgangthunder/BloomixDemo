import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

const BACKEND_VERSION = '0.3.2';

async function bootstrap() {
  console.log(`🔥🔥🔥 BACKEND VERSION ${BACKEND_VERSION} STARTING 🔥🔥🔥`);
  
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
  // 🔥 BACKEND VERSION 0.3.2 🔥
  // ========================================
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🔥🔥🔥 BACKEND VERSION ${BACKEND_VERSION} STARTED 🔥🔥🔥`);
  console.log('🔧 UUID Validation Fix | Draft API | Approval Workflow');
  console.log(`🚀 API running on: http://localhost:${port}/api`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}
bootstrap();